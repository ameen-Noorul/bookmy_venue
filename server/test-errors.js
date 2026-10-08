const BASE = process.env.BASE_URL || "http://localhost:5000";
const API = BASE + "/api/v1";
let passed = 0, failed = 0;

function check(name, ok, extra = "") {
  if (ok) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.log(`FAIL  ${name} ${extra}`); }
}

function hasStandardShape(body) {
  const e = body && body.error;
  return !!(e && typeof e.code === "string" && typeof e.message === "string" && e.requestId);
}

async function call(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

(async () => {
  let r = await call(BASE + "/this-route-does-not-exist");
  check("unknown route -> 404", r.status === 404, JSON.stringify(r));
  check("unknown route has standard shape", hasStandardShape(r.body));
  check("unknown route code is NOT_FOUND", r.body?.error?.code === "NOT_FOUND");

  r = await call(API + "/auth/register", { method: "POST", body: JSON.stringify({}) });
  check("empty register -> 400", r.status === 400, JSON.stringify(r));
  check("validation error has standard shape", hasStandardShape(r.body));

  r = await call(API + "/auth/login", { method: "POST", body: "{ not valid json" });
  check("malformed JSON -> 400", r.status === 400, JSON.stringify(r));
  check("malformed JSON code is INVALID_JSON", r.body?.error?.code === "INVALID_JSON");

  r = await call(API + "/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "nobody@example.com", password: "wrongpass123" }),
  });
  check("wrong login -> 4xx", r.status >= 400 && r.status < 500, JSON.stringify(r));
  check("wrong login has standard shape", hasStandardShape(r.body), JSON.stringify(r.body));

  r = await call(API + "/bookings/a6075ba2-80eb-48a7-9431-a759ddf7a516");
  check("no token -> 401", r.status === 401, JSON.stringify(r));
  check("no token has standard shape", hasStandardShape(r.body), JSON.stringify(r.body));
  check("no stack trace leaked", !JSON.stringify(r.body).includes("at "));

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})();