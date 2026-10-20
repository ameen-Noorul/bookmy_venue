const crypto = require('crypto');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const CUSTOMERS = 6;

let passCount = 0;
let failCount = 0;
function check(label, condition, extra = '') {
  if (condition) {
    console.log(`PASS: ${label}`);
    passCount++;
  } else {
    console.log(`FAIL: ${label} ${extra}`);
    failCount++;
  }
}

async function request(method, path, { token, body, headers: extra } = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

// Register, and take the token from the response (falls back to login).
async function signup(label) {
  const email = `conc_${label}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@test.com`;
  const password = 'password123';
  const reg = await request('POST', '/auth/register', { body: { email, password, name: `Conc ${label}` } });
  let token = reg.data?.data?.accessToken ?? reg.data?.accessToken;
  if (!token) {
    const login = await request('POST', '/auth/login', { body: { email, password } });
    token = login.data?.data?.accessToken ?? login.data?.accessToken;
  }
  return { email, password, token };
}

const day = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
const bookingBody = (venueId, date) => ({
  venueId,
  eventDate: date,
  eventEndDate: date,
  eventType: 'Wedding',
  guestCount: 20,
});

async function main() {
  // 1. Owner + venue + admin approval
  const owner = await signup('owner');
  check('Owner registered', !!owner.token);

  const venueRes = await request('POST', '/venues', {
    token: owner.token,
    body: {
      name: 'Concurrency Test Hall',
      address: '1 Race Street',
      city: 'Kozhikode',
      state: 'Kerala',
      pincode: '673001',
      capacity: 100,
      pricePerDay: 5000,
    },
  });
  const venueId = venueRes.data?.data?.id;
  check('Venue created', venueRes.status === 201 && !!venueId, JSON.stringify(venueRes.data));
  if (!venueId) return finish();

  const adminLogin = await request('POST', '/auth/login', {
    body: { email: 'test@example.com', password: 'password123' },
  });
  const adminToken = adminLogin.data?.data?.accessToken;
  if (!adminToken) {
    check('Admin login', false, JSON.stringify(adminLogin.data));
    return finish();
  }
  const review = await request('PATCH', `/venues/${venueId}/review`, {
    token: adminToken,
    body: { status: 'ACTIVE' },
  });
  check('Admin approved venue', review.status === 200, JSON.stringify(review.data));

  // 2. Several different customers
  const customers = [];
  for (let i = 0; i < CUSTOMERS; i++) customers.push(await signup(`cust${i}`));
  check(`${CUSTOMERS} customers registered`, customers.every((c) => !!c.token));

  // 3. Everyone books the SAME venue and date at the SAME moment
  const results = await Promise.all(
    customers.map((c) =>
      request('POST', '/bookings', {
        token: c.token,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: bookingBody(venueId, day),
      }),
    ),
  );
  const statuses = results.map((r) => r.status);
  const created = statuses.filter((s) => s === 201).length;
  const conflicts = statuses.filter((s) => s === 409).length;
  console.log(`  statuses: ${statuses.join(', ')}`);
  check('Exactly ONE of the simultaneous bookings succeeded (201)', created === 1, `got ${created}`);
  check('All the others were rejected with 409', conflicts === CUSTOMERS - 1, `got ${conflicts} conflicts`);

  // 4. The database agrees: only one booking exists for that venue
  const ownerLogin = await request('POST', '/auth/login', { body: { email: owner.email, password: owner.password } });
  const ownerToken = ownerLogin.data?.data?.accessToken;
  const list = await request('GET', `/bookings/venue/${venueId}`, { token: ownerToken });
  const count = Array.isArray(list.data?.data) ? list.data.data.length : -1;
  check('Venue owner sees exactly 1 booking for the venue', count === 1, `got ${count}`);

  // 5. Idempotency: the same key sent twice creates only one booking
  const key = crypto.randomUUID();
  const otherDay = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10);
  const first = await request('POST', '/bookings', {
    token: customers[0].token,
    headers: { 'Idempotency-Key': key },
    body: bookingBody(venueId, otherDay),
  });
  const second = await request('POST', '/bookings', {
    token: customers[0].token,
    headers: { 'Idempotency-Key': key },
    body: bookingBody(venueId, otherDay),
  });
  const firstId = first.data?.data?.id;
  const secondId = second.data?.data?.id;
  check('Same Idempotency-Key: first request succeeded', first.status === 201 && !!firstId, JSON.stringify(first.data));
  check(
    'Same Idempotency-Key: retry returned the SAME booking, not a conflict',
    second.status < 300 && secondId === firstId,
    `status ${second.status} ${JSON.stringify(second.data)}`,
  );

  finish();
}

function finish() {
  console.log('----------------------------------------');
  console.log(`${passCount} passed, ${failCount} failed`);
  console.log('----------------------------------------');
  process.exitCode = failCount ? 1 : 0;
}

main().catch((err) => {
  console.error('FAIL: script crashed:', err);
  process.exitCode = 1;
});