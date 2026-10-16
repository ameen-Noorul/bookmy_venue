const { io } = require("socket.io-client");
const redisClient = require("./src/config/redis");
const { initEmitter, emitToUser } = require("./src/realtime/emitter");

const BASE = process.env.BASE_URL || "http://localhost:5000";
let passed = 0, failed = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} ${ok ? "" : extra}`);
  ok ? passed++ : failed++;
};

async function post(path, payload) {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let body = null;
  try { body = await res.json(); } catch (e) { /* not JSON */ }
  return { status: res.status, body };
}

function idFromToken(token) {
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  return payload.id;
}

async function createUser(label) {
  const email = `rte-${label}-${Date.now()}@example.com`;
  const password = "password123";
  await post("/auth/register", { name: `Emit Test ${label.toUpperCase()}`, email, password });
  const login = await post("/auth/login", { email, password });
  const data = (login.body && (login.body.data ?? login.body)) || {};
  return { token: data.accessToken, userId: data.accessToken ? idFromToken(data.accessToken) : undefined };
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, { auth: { token }, reconnection: false, transports: ["websocket"] });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(err));
    setTimeout(() => reject(new Error("connect timeout")), 4000);
  });
}

// Resolves with the payload if the event arrives within ms, otherwise null.
function waitForEvent(socket, event, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

(async () => {
  const a = await createUser("a");
  const b = await createUser("b");
  check("Got tokens for two test users", Boolean(a.token && b.token));

  const sa = await connect(a.token);
  const sb = await connect(b.token);
  check("Both sockets connected", sa.connected && sb.connected);

  // This script plays the role of the worker: a separate process with its own Redis client.
  await redisClient.connect();
  initEmitter(redisClient);

  const waitA = waitForEvent(sa, "notification:new", 3000);
  const waitB = waitForEvent(sb, "notification:new", 1500);

  const sent = { id: "test-1", message: "New booking on your venue", createdAt: new Date().toISOString() };
  emitToUser(a.userId, "notification:new", sent);

  const gotA = await waitA;
  const gotB = await waitB;

  check("User A receives the event published from another process", gotA !== null, "timed out");
  check("Payload arrives intact", gotA && gotA.id === sent.id && gotA.message === sent.message, JSON.stringify(gotA));
  check("User B does NOT receive A's event (rooms are private)", gotB === null, JSON.stringify(gotB));

  sa.close();
  sb.close();
  await redisClient.quit();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})();