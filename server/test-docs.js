const SwaggerParser = require("@apidevtools/swagger-parser");
const spec = require("./src/docs/openapi");

const BASE = process.env.BASE_URL || "http://localhost:5000";
let passed = 0, failed = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} ${ok ? "" : extra}`);
  ok ? passed++ : failed++;
};

(async () => {
  // 1. Spec is valid OpenAPI 3 (also resolves every $ref)
  try {
    await SwaggerParser.validate(JSON.parse(JSON.stringify(spec)));
    check("Spec is valid OpenAPI 3 with all $refs resolving", true);
  } catch (e) {
    check("Spec is valid OpenAPI 3 with all $refs resolving", false, e.message);
  }

  // 2. Every expected route is documented
  const expected = [
    "/auth/register", "/auth/login", "/auth/refresh", "/auth/logout",
    "/venues", "/venues/{venueId}", "/venues/{venueId}/review",
    "/bookings", "/bookings/{bookingId}", "/bookings/venue/{venueId}",
  ];
  for (const p of expected) check(`Documented: ${p}`, Boolean(spec.paths[p]));

  // 3. Every protected operation declares security
  const open = ["/auth/register", "/auth/login", "/auth/refresh", "/auth/logout"];
  let unsecured = [];
  for (const [p, methods] of Object.entries(spec.paths)) {
    for (const [m, op] of Object.entries(methods)) {
      if (m === "parameters") continue;
      const isPublic = open.includes(p) || (m === "get" && (p === "/venues" || p === "/venues/{venueId}"));
      if (!isPublic && !op.security) unsecured.push(`${m.toUpperCase()} ${p}`);
    }
  }
  check("All non-public operations require bearerAuth", unsecured.length === 0, unsecured.join(", "));

  // 4. Live endpoints respond
  try {
    const j = await fetch(`${BASE}/api/docs.json`);
    const body = await j.json();
    check("GET /api/docs.json returns 200 with the spec", j.status === 200 && body.openapi === "3.0.3", `status ${j.status}`);
    const ui = await fetch(`${BASE}/api/docs/`);
    const html = await ui.text();
    check("GET /api/docs/ serves Swagger UI", ui.status === 200 && html.includes("swagger-ui"), `status ${ui.status}`);
  } catch (e) {
    check("Server reachable", false, e.message);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})();