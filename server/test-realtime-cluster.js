const { io } = require("socket.io-client");
const redisClient = require("./src/config/redis");
const { initEmitter, emitToUser } = require("./src/realtime/emitter");

// Goes through nginx on port 3000 (the Docker stack with 3 API replicas).
const BASE = process.env.BASE_URL || "http://localhost:3000";
const SOCKETS = 9;
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
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).id;
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, { auth: { token }, reconnection: false, transports: ["websocket"] });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(err));
    setTimeout(() => reject(new Error("connect timeout")), 5000);
  });
}

const whoami = (socket) => new Promise((resolve) => socket.emit("whoami", (r) => resolve(r)));

function waitForEvent(socket, event, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once(event, (payload) => { clearTimeout(timer); resolve(payload); });
  });
}

(async () => {
  const email = `cluster-${Date.now()}@example.com`;
  await post("/auth/register", { name: "Cluster Test", email, password: "password123" });
  const login = await post("/auth/login", { email, password: "password123" });
  const data = (login.body && (login.body.data ?? login.body)) || {};
  check("Got a token through nginx", Boolean(data.accessToken), JSON.stringify(login.body));
  if (!data.accessToken) { process.exitCode = 1; return; }
  const userId = idFromToken(data.accessToken);

  let sockets = [];
  try {
    sockets = await Promise.all(Array.from({ length: SOCKETS }, () => connectSocket(data.accessToken)));
  } catch (e) {
    check(`Open ${SOCKETS} WebSockets through nginx`, false, e.message);
    process.exitCode = 1;
    return;
  }
  check(`Opened ${SOCKETS} WebSockets through nginx`, sockets.length === SOCKETS);

  const instances = new Set((await Promise.all(sockets.map(whoami))).map((r) => r.instance));
  check(`Sockets spread across more than one API instance (${[...instances].join(", ")})`,
    instances.size > 1, "all on one instance: start with --scale api=3 and restart nginx");

  // Publish from outside the API (like the worker would).
  await redisClient.connect();
  initEmitter(redisClient);
  const waits = sockets.map((s) => waitForEvent(s, "notification:new", 4000));
  emitToUser(userId, "notification:new", { id: "cluster-1", message: "cluster test" });
  const results = await Promise.all(waits);
  check(`All ${SOCKETS} sockets got the event, whichever instance holds them`,
    results.every((r) => r && r.id === "cluster-1"), JSON.stringify(results.map((r) => !!r)));

  sockets.forEach((s) => s.close());
  await redisClient.quit();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})();