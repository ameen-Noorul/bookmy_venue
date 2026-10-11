const crypto = require("crypto");

const CONCURRENT_REQUESTS = 5;
const BASE_URL = "http://localhost:3000/api/v1";

const LOGIN_ENDPOINT = `${BASE_URL}/auth/login`;
const BOOKING_ENDPOINT = `${BASE_URL}/bookings`;

const TEST_EMAIL = "ameen@gmail.com";
const TEST_PASSWORD = "password123";

const VENUE_ID = "fab0e392-ff42-460c-893b-adf26c2f1898";

// A fresh random date every run, so old test bookings can't cause a false result.
const year = 2029 + Math.floor(Math.random() * 20);
const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
const EVENT_DATE = `${year}-${month}-${day}`;

async function login() {
  const res = await fetch(LOGIN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Login failed: ${JSON.stringify(body)}`);
  const token = body.data?.accessToken;

  if (!token) {
    throw new Error(
      `Login response did not contain accessToken: ${JSON.stringify(body)}`,
    );
  }

  return token;
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
      eventDate: EVENT_DATE,
      eventEndDate: EVENT_DATE,
      eventType: "Wedding",
      guestCount: 100,
    }),
  });
  const body = await res.json().catch(() => ({}));
  console.log(
    `Request ${i}: status ${res.status} -`,
    body.error?.message || body.message || body.data?.id || JSON.stringify(body),
  );
  return res.status;
}

async function main() {
  console.log("Test date:", EVENT_DATE);
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
  const statuses = await Promise.all(requests);

  const created = statuses.filter((s) => s === 201).length;
  const rejected = statuses.filter((s) => s === 409).length;

  console.log(`\n${created} created, ${rejected} rejected as double-booking`);
  if (created === 1 && rejected === CONCURRENT_REQUESTS - 1) {
    console.log("PASS: exactly one booking won, the rest were rejected");
  } else {
    console.log("FAIL: expected exactly 1 created and the rest rejected (409)");
  }
}

main().catch((err) => console.error("Script failed:", err));