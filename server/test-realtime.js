const { io } = require("socket.io-client");

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

// Reads the user id out of the JWT itself, so it doesn't depend on response shape.
function idFromToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return payload.id ?? payload.userId ?? payload.sub;
  } catch (e) {
    return undefined;
  }
}

async function createUser(label) {
  const email = `rt-${label}-${Date.now()}@example.com`;
  const password = "password123";
  const name = `Realtime Test ${label.toUpperCase()}`;

  const reg = await post("/auth/register", { name, email, password });
  if (reg.status >= 400) {
    console.log(`  [debug] register ${label}: status ${reg.status}, body ${JSON.stringify(reg.body)}`);
  }

  const login = await post("/auth/login", { email, password });
  if (login.status >= 400) {
    console.log(`  [debug] login ${label}: status ${login.status}, body ${JSON.stringify(login.body)}`);
  }

  const data = (login.body && (login.body.data ?? login.body)) || {};
  const token = data.accessToken;
  return { token, userId: token ? idFromToken(token) : undefined };
}

// Resolves with { connected, error } instead of throwing.
function tryConnect(token) {
  return new Promise((resolve) => {
    const socket = io(BASE, {
      auth: token ? { token } : {},
      reconnection: false,
      transports: ["websocket"],
    });
    socket.on("connect", () => resolve({ socket, connected: true }));
    socket.on("connect_error", (err) => {
      socket.close();
      resolve({ connected: false, error: err.message });
    });
    setTimeout(() => resolve({ connected: false, error: "timeout" }), 4000);
  });
}

const whoami = (socket) =>
  new Promise((resolve) => socket.emit("whoami", (r) => resolve(r)));

(async () => {
  const a = await createUser("a");
  const b = await createUser("b");
  check("Got access tokens for two test users", Boolean(a.token && b.token));

  const none = await tryConnect(null);
  check("No token is rejected", !none.connected && /Authentication required/.test(none.error), none.error);

  const bad = await tryConnect("not.a.real.token");
  check("Garbage token is rejected", !bad.connected && /Invalid/.test(bad.error), bad.error);

  const ca = await tryConnect(a.token);
  check("Valid token (user A) connects", ca.connected, ca.error);
  const cb = await tryConnect(b.token);
  check("Valid token (user B) connects", cb.connected, cb.error);

  if (ca.connected && cb.connected) {
    const ra = await whoami(ca.socket);
    const rb = await whoami(cb.socket);
    check("Server binds socket A to user A's id", ra.userId === a.userId, JSON.stringify(ra));
    check("Server binds socket B to user B's id", rb.userId === b.userId, JSON.stringify(rb));
    check("A and B are different identities", ra.userId !== rb.userId);
    ca.socket.close();
    cb.socket.close();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})();