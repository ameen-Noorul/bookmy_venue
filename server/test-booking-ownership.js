const BASE_URL = 'http://localhost:5000/api/v1';
const crypto = require('crypto');

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

// A date ~60 days from now, so the test never expires.
const bookingDate = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

async function main() {
  const suffix = Date.now();
  const ownerEmail = `bookowner_${suffix}@test.com`;
  const customerEmail = `bookcustomer_${suffix}@test.com`;
  const strangerEmail = `bookstranger_${suffix}@test.com`;
  const password = 'password123';

  await request('POST', '/auth/register', { body: { email: ownerEmail, password, name: 'Booking Owner' } });
  let ownerLogin = await request('POST', '/auth/login', { body: { email: ownerEmail, password } });
  let ownerToken = ownerLogin.data?.data?.accessToken;
  check('Owner registered + logged in', !!ownerToken, JSON.stringify(ownerLogin.data));

  const createVenueRes = await request('POST', '/venues', {
    token: ownerToken,
    body: {
      name: 'Booking Test Hall',
      address: '456 Second Street',
      city: 'Kozhikode',
      state: 'Kerala',
      pincode: '673002',
      capacity: 50,
      pricePerDay: 3000,
    },
  });
  const venueId = createVenueRes.data?.data?.id;
  check('Venue created', createVenueRes.status === 201 && !!venueId, JSON.stringify(createVenueRes.data));

  const adminLogin = await request('POST', '/auth/login', {
    body: { email: 'test@example.com', password: 'password123' },
  });
  const tokenAdmin = adminLogin.data?.data?.accessToken;
  if (!tokenAdmin) {
    console.log('FAIL: no admin token.', JSON.stringify(adminLogin.data));
    failCount++;
    printSummary();
    return;
  }

  const reviewRes = await request('PATCH', `/venues/${venueId}/review`, {
    token: tokenAdmin,
    body: { status: 'ACTIVE' },
  });
  check('Admin approved venue', reviewRes.status === 200 && reviewRes.data?.data?.status === 'ACTIVE', JSON.stringify(reviewRes.data));

  // Log in again so the token carries the OWNER role granted on approval.
  ownerLogin = await request('POST', '/auth/login', { body: { email: ownerEmail, password } });
  ownerToken = ownerLogin.data?.data?.accessToken;

  await request('POST', '/auth/register', { body: { email: customerEmail, password, name: 'Customer' } });
  const customerLogin = await request('POST', '/auth/login', { body: { email: customerEmail, password } });
  const customerToken = customerLogin.data?.data?.accessToken;
  check('Customer registered + logged in', !!customerToken);

  const createBookingRes = await request('POST', '/bookings', {
    token: customerToken,
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: {
      venueId,
      eventDate: bookingDate,
      eventEndDate: bookingDate,
      eventType: 'Wedding',
      guestCount: 30,
    },
  });
  const bookingId = createBookingRes.data?.data?.id;
  check('Customer created booking', createBookingRes.status === 201 && !!bookingId, JSON.stringify(createBookingRes.data));

  await request('POST', '/auth/register', { body: { email: strangerEmail, password, name: 'Stranger' } });
  const strangerLogin = await request('POST', '/auth/login', { body: { email: strangerEmail, password } });
  const strangerToken = strangerLogin.data?.data?.accessToken;
  check('Stranger registered + logged in', !!strangerToken);

  const ownViewRes = await request('GET', `/bookings/${bookingId}`, { token: customerToken });
  check('Customer can view own booking (200)', ownViewRes.status === 200, `got ${ownViewRes.status}`);

  const strangerViewRes = await request('GET', `/bookings/${bookingId}`, { token: strangerToken });
  check('Stranger blocked from viewing booking (403)', strangerViewRes.status === 403, `got ${strangerViewRes.status}`);

  const strangerCancelRes = await request('DELETE', `/bookings/${bookingId}`, { token: strangerToken });
  check('Stranger blocked from cancelling booking (403)', strangerCancelRes.status === 403, `got ${strangerCancelRes.status}`);

  const venueBookingsRes = await request('GET', `/bookings/venue/${venueId}`, { token: ownerToken });
  const foundBooking = venueBookingsRes.data?.data?.some((b) => b.id === bookingId);
  check('Venue owner can list bookings for their venue (200, includes the booking)', venueBookingsRes.status === 200 && foundBooking, JSON.stringify(venueBookingsRes.data));

  const strangerVenueBookingsRes = await request('GET', `/bookings/venue/${venueId}`, { token: strangerToken });
  check('Non-owner blocked from listing venue bookings (403)', strangerVenueBookingsRes.status === 403, `got ${strangerVenueBookingsRes.status}`);

  const ownCancelRes = await request('DELETE', `/bookings/${bookingId}`, { token: customerToken });
  check('Customer can cancel own booking (200)', ownCancelRes.status === 200, `got ${ownCancelRes.status}`);

  printSummary();
}

function printSummary() {
  console.log('----------------------------------------');
  console.log(`${passCount} passed, ${failCount} failed`);
  console.log('----------------------------------------');
  process.exitCode = failCount ? 1 : 0;
}

main().catch((err) => {
  console.error('FAIL: script crashed:', err);
  process.exitCode = 1;
});