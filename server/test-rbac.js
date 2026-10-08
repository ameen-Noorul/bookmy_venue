// One-shot script that runs the entire RBAC test plan automatically.
// Run with: node test-rbac.js

const BASE_URL = "http://localhost:5000";

let passCount = 0;
let failCount = 0;

function check(label, condition, extra = "") {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passCount++;
  } else {
    console.log(`❌ FAIL: ${label} ${extra}`);
    failCount++;
  }
}

async function request(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // some responses (204) have no body
  }

  return { status: res.status, data };
}

async function main() {
  const suffix = Date.now();
  const emailA = `ownerA_${suffix}@test.com`;
  const emailB = `ownerB_${suffix}@test.com`;
  const password = "password123";

  // Step 1-2: register + login Owner A
  await request("POST", "/auth/register", {
    body: { email: emailA, password, name: "Owner A" },
  });
  const loginA1 = await request("POST", "/auth/login", {
    body: { email: emailA, password },
  });
  let tokenA = loginA1.data?.data?.accessToken;
  check(
    "Owner A registered + logged in",
    !!tokenA,
    JSON.stringify(loginA1.data),
  );

  // Step 1-2: register + login Owner B
  await request("POST", "/auth/register", {
    body: { email: emailB, password, name: "Owner B" },
  });
  const loginB = await request("POST", "/auth/login", {
    body: { email: emailB, password },
  });
  const tokenB = loginB.data?.data?.accessToken;
  check(
    "Owner B registered + logged in",
    !!tokenB,
    JSON.stringify(loginB.data),
  );

  // Step 3: Owner A creates a venue
  const createRes = await request("POST", "/venues", {
    token: tokenA,
    body: {
      name: "Test Hall A",
      address: "123 Main Street",
      city: "Kozhikode",
      state: "Kerala",
      pincode: "673001",
      capacity: 100,
      pricePerDay: 5000,
    },
  });
  const venueId = createRes.data?.data?.id;
  check(
    "Owner A created venue (PENDING_REVIEW)",
    createRes.status === 201 && !!venueId,
    JSON.stringify(createRes.data),
  );

  // Step 4: admin login — CHANGE these to your real bootstrapped admin credentials
  const adminLogin = await request("POST", "/auth/login", {
    body: { email: "test@example.com", password: "password123" },
  });
  const tokenAdmin = adminLogin.data?.data?.accessToken;
  if (!tokenAdmin) {
    console.log(
      "⚠️  SKIPPING remaining tests — no admin token. Edit the admin email/password in this script.",
    );
    console.log("Admin login response:", JSON.stringify(adminLogin.data));
    printSummary();
    return;
  }

  const reviewRes = await request("PATCH", `/venues/${venueId}/review`, {
    token: tokenAdmin,
    body: { status: "ACTIVE" },
  });
  check(
    "Admin approved venue",
    reviewRes.status === 200 && reviewRes.data?.data?.status === "ACTIVE",
    JSON.stringify(reviewRes.data),
  );

  // Step 5: re-login Owner A for fresh token with OWNER role
  const loginA2 = await request("POST", "/auth/login", {
    body: { email: emailA, password },
  });
  tokenA = loginA2.data?.data?.accessToken;

  // Step 6: Owner A edits own venue — should succeed
  const updateRes = await request("PATCH", `/venues/${venueId}`, {
    token: tokenA,
    body: { name: "Updated Hall Name" },
  });
  check(
    "Owner A can update own venue",
    updateRes.status === 200 &&
      updateRes.data?.data?.name === "Updated Hall Name",
    JSON.stringify(updateRes.data),
  );

  // Step 7: Owner A tries to sneak in protected fields — should be rejected
  const sneakRes = await request("PATCH", `/venues/${venueId}`, {
    token: tokenA,
    body: { name: "Sneaky", status: "ACTIVE", approvedBy: "hacker" },
  });
  check(
    "Protected fields rejected (400)",
    sneakRes.status === 400,
    `got ${sneakRes.status} ${JSON.stringify(sneakRes.data)}`,
  );

  // Step 9: Owner B tries to edit Owner A's venue — should be forbidden
  const hijackRes = await request("PATCH", `/venues/${venueId}`, {
    token: tokenB,
    body: { name: "Hijacked!" },
  });
  check(
    "Owner B blocked from editing (403)",
    hijackRes.status === 403,
    `got ${hijackRes.status}`,
  );

  // Step 10: Owner B tries to delete Owner A's venue — should be forbidden
  const hijackDeleteRes = await request("DELETE", `/venues/${venueId}`, {
    token: tokenB,
  });
  check(
    "Owner B blocked from deleting (403)",
    hijackDeleteRes.status === 403,
    `got ${hijackDeleteRes.status}`,
  );

  // Step 11: public GET with no token — should succeed
  const publicRes = await request("GET", `/venues/${venueId}`);
  check(
    "Public GET works with no token (200)",
    publicRes.status === 200,
    `got ${publicRes.status}`,
  );

  // Step 12: Owner A deletes own venue — should succeed
  const deleteRes = await request("DELETE", `/venues/${venueId}`, {
    token: tokenA,
  });
  check(
    "Owner A can delete own venue (204)",
    deleteRes.status === 204,
    `got ${deleteRes.status}`,
  );

  // Step 13: confirm it's gone
  const goneRes = await request("GET", `/venues/${venueId}`);
  check(
    "Venue confirmed deleted (404)",
    goneRes.status === 404,
    `got ${goneRes.status}`,
  );

  printSummary();
}

function printSummary() {
  console.log("\n----------------------------------------");
  console.log(`${passCount} passed, ${failCount} failed`);
  console.log("----------------------------------------");
}

main().catch((err) => {
  console.error("Script crashed:", err);
});
