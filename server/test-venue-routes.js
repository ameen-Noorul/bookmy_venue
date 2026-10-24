const API = process.env.BASE_URL ? `${process.env.BASE_URL}/api/v1` : 'http://localhost:5000/api/v1';
let passed = 0, failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`);
  ok ? passed++ : failed++;
};

async function request(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
const tokenOf = (r) => r.data?.data?.accessToken ?? r.data?.accessToken;

async function signup(label) {
  const email = `vr-${label}-${Date.now()}-${Math.floor(Math.random() * 1e5)}@test.com`;
  await request('POST', '/auth/register', { body: { email, password: 'password123', name: `VR ${label}` } });
  const login = await request('POST', '/auth/login', { body: { email, password: 'password123' } });
  return tokenOf(login);
}

(async () => {
  const a = await signup('a');
  const b = await signup('b');
  check('Two users registered', Boolean(a && b));

  const created = await request('POST', '/venues', {
    token: a,
    body: { name: 'Route Test Hall', address: '9 Route Road', city: 'Kozhikode', state: 'Kerala', pincode: '673001', capacity: 60, pricePerDay: 3500 },
  });
  const venueId = created.data?.data?.id;
  check('User A created a venue', created.status === 201 && Boolean(venueId), JSON.stringify(created.data));

  // /venues/mine must NOT be swallowed by /venues/:venueId
  const minA = await request('GET', '/venues/mine', { token: a });
  check('GET /venues/mine returns 200 (not swallowed by /:venueId)', minA.status === 200, `got ${minA.status} ${JSON.stringify(minA.data)}`);
  check('/venues/mine returns an array containing the venue', Array.isArray(minA.data?.data) && minA.data.data.some((v) => v.id === venueId), JSON.stringify(minA.data));

  const minB = await request('GET', '/venues/mine', { token: b });
  check("User B's /venues/mine does NOT contain A's venue", minB.status === 200 && !(minB.data?.data || []).some((v) => v.id === venueId));

  const noAuth = await request('GET', '/venues/mine');
  check('/venues/mine without a token -> 401', noAuth.status === 401, `got ${noAuth.status}`);

  // /venues/pending is admin-only
  const pendingUser = await request('GET', '/venues/pending', { token: a });
  check('/venues/pending as a normal user -> 403', pendingUser.status === 403, `got ${pendingUser.status}`);

  const admin = await request('POST', '/auth/login', { body: { email: 'test@example.com', password: 'password123' } });
  const adminToken = tokenOf(admin);
  const pendingAdmin = await request('GET', '/venues/pending', { token: adminToken });
  const list = pendingAdmin.data?.data;
  check('/venues/pending as admin -> 200 and lists the new venue', pendingAdmin.status === 200 && Array.isArray(list) && list.some((v) => v.id === venueId), `got ${pendingAdmin.status} ${JSON.stringify(pendingAdmin.data).slice(0, 200)}`);

  // The normal single-venue route still works
  const one = await request('GET', `/venues/${venueId}`);
  check('GET /venues/:id still works for a real id', one.status === 200 && one.data?.data?.id === venueId, `got ${one.status}`);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})().catch((err) => {
  console.error('FAIL: script crashed:', err);
  process.exitCode = 1;
});