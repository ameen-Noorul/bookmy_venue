const BASE = process.env.BASE_URL || "http://localhost:5000";
let passed = 0, failed = 0;

function check(name, ok, extra = "") {
  if (ok) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.log(`FAIL  ${name} ${extra}`); }
}

async function status(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res.status;
}

(async () => {
  check("GET /health still works (unversioned)", (await status("/health")) === 200);
  check("GET /metrics still works (unversioned)", (await status("/metrics")) === 200);
  check("GET /api/v1 works", (await status("/api/v1")) === 200);

  check("v1 venues is reachable", (await status("/api/v1/venues")) !== 404);
  check("v1 auth/login is reachable", (await status("/api/v1/auth/login", { method: "POST", body: "{}" })) !== 404);

  // Old unversioned paths must be gone
  check("old /auth/login -> 404", (await status("/auth/login", { method: "POST", body: "{}" })) === 404);
  check("old /venues -> 404", (await status("/venues")) === 404);
  check("old /bookings -> 404", (await status("/bookings")) === 404);

  // A future version should not exist yet
  check("/api/v2 does not exist yet -> 404", (await status("/api/v2/venues")) === 404);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})();