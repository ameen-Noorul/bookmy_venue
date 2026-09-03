const crypto = require("crypto");

const CONCURRENT_REQUESTS = 5;
const BASE_URL = "http://localhost:5000";

const LOGIN_ENDPOINT = `${BASE_URL}/auth/login`;
const BOOKING_ENDPOINT = `${BASE_URL}/bookings`;

const TEST_EMAIL = "ameen@gmail.com";
const TEST_PASSWORD = "password123";

const VENUE_ID = "097e931b-7b60-4497-bbca-78a93362b697";

async function login() {
  const res = await fetch(LOGIN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Login failed: ${JSON.stringify(body)}`);
  return body.token || body.accessToken; // adjust if your login response uses a different key
}

async function fireBooking(i, token) {
  const res = await fetch(BOOKING_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": crypto.randomUUID(), // unique per request = simulates 5 different people
    },
    body: JSON.stringify({
      venueId: VENUE_ID,
      eventDate: "2027-04-20",
      eventEndDate: "2027-04-20",
      eventType: "Wedding",
      guestCount: 100,
    }),
  });
  const body = await res.json().catch(() => ({}));
  console.log(
    `Request ${i}: status ${res.status} —`,
    body.message || body.error || body.id || JSON.stringify(body),
  );
}

async function main() {
  console.log("Logging in...");
  const token = await login();
  console.log(
    "Got token. Firing",
    CONCURRENT_REQUESTS,
    "concurrent booking requests...\n",
  );

  const requests = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
    fireBooking(i + 1, token),
  );
  await Promise.all(requests);
}

main().catch((err) => console.error("Script failed:", err));
