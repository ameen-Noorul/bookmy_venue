const { io } = require("socket.io-client");
const { notificationQueue, connection } = require("./src/queues/notification.queue");

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
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).id;
}

async function createUser(label) {
  const email = `wp-${label}-${Date.now()}@example.com`;
  const password = "password123";
  await post("/auth/register", { name: `Worker Push ${label}`, email, password });
  const login = await post("/auth/login", { email, password });
  const data = (login.body && (login.body.data ?? login.body)) || {};
  return { token: data.accessToken, userId: data.accessToken ? idFromToken(data.accessToken) : undefined };
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, { auth: { token }, reconnection: false, transports: ["websocket"] });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(err));
    setTimeout(() => reject(new Error("connect timeout")), 4000);
  });
}

function waitForEvent(socket, event, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once(event, (payload) => { clearTimeout(timer); resolve(payload); });
  });
}

(async () => {
  const owner = await createUser("owner");
  check("Created test user", Boolean(owner.token));

  const socket = await connectSocket(owner.token);
  check("Socket connected", socket.connected);

  const waiting = waitForEvent(socket, "notification:new", 8000);

  // Same job the booking service enqueues. The WORKER must be running in another terminal.
  await notificationQueue.add("notify-owner-booking", {
    ownerId: owner.userId,
    venueName: "Push Test Hall",
    eventDate: new Date().toISOString(),
  });

  const got = await waiting;
  check("Owner receives notification:new from the worker", got !== null, "timed out: is the worker running?");
  check("Payload contains the saved notification row (id, message, createdAt)",
    got && got.id && got.message && got.createdAt, JSON.stringify(got));
  check("Message mentions the venue", got && /Push Test Hall/.test(got.message), JSON.stringify(got));

  socket.close();
  await notificationQueue.close();
  connection.disconnect();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})();