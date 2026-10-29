const API = process.env.BASE_URL ? `${process.env.BASE_URL}/api/v1` : 'http://localhost:5000/api/v1';
let passed = 0, failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`);
  ok ? passed++ : failed++;
};

async function request(method, path, { token, body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch {}
  const setCookie = (res.headers.getSetCookie ? res.headers.getSetCookie() : []).find((c) => c.startsWith('refreshToken='));
  return { status: res.status, data, cookie: setCookie ? setCookie.split(';')[0] : null };
}

const tokenOf = (r) => r.data?.data?.accessToken ?? r.data?.accessToken;
const idFromToken = (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()).id;
const PASSWORD = 'password123';

async function signup(label) {
  const email = `adm-${label}-${Date.now()}-${Math.floor(Math.random() * 1e5)}@test.com`;
  await request('POST', '/auth/register', { body: { email, password: PASSWORD, name: `Adm ${label}` } });
  const login = await request('POST', '/auth/login', { body: { email, password: PASSWORD } });
  const token = tokenOf(login);
  return { email, token, userId: token ? idFromToken(token) : null, cookie: login.cookie };
}

(async () => {
  const adminLogin = await request('POST', '/auth/login', { body: { email: 'test@example.com', password: PASSWORD } });
  const adminToken = tokenOf(adminLogin);
  check('Admin logged in', Boolean(adminToken), JSON.stringify(adminLogin.data));
  if (!adminToken) { process.exitCode = 1; return; }
  const adminId = idFromToken(adminToken);

  const target = await signup('target');
  const other = await signup('other');
  check('Two normal users created', Boolean(target.token && other.token));

  // --- GET /users ---
  check('GET /users without a token -> 401', (await request('GET', '/users')).status === 401);
  check('GET /users as a normal user -> 403', (await request('GET', '/users', { token: other.token })).status === 403);

  const list = await request('GET', '/users?limit=2', { token: adminToken });
  check('GET /users as admin -> 200 with an array', list.status === 200 && Array.isArray(list.data?.data), `got ${list.status}`);
  check('limit=2 returns at most 2 users', (list.data?.data || []).length <= 2 && list.data?.pagination?.limit === 2, JSON.stringify(list.data?.pagination));
  check('Password hash is never returned', (list.data?.data || []).every((u) => !('password' in u)));
  check('limit=500 is rejected (400)', (await request('GET', '/users?limit=500', { token: adminToken })).status === 400);

  const found = await request('GET', `/users?search=${encodeURIComponent(target.email)}`, { token: adminToken });
  check('Search by email finds exactly the target user', found.data?.data?.length === 1 && found.data.data[0].email === target.email, JSON.stringify(found.data?.data));

  // --- ban ---
  const banPath = `/users/${target.userId}/ban`;
  check('Ban as a normal user -> 403', (await request('PATCH', banPath, { token: other.token, body: { isBanned: true } })).status === 403);
  check('Ban with an invalid id -> 400', (await request('PATCH', '/users/not-a-uuid/ban', { token: adminToken, body: { isBanned: true } })).status === 400);
  check('Ban an unknown user -> 404', (await request('PATCH', '/users/11111111-1111-4111-8111-111111111111/ban', { token: adminToken, body: { isBanned: true } })).status === 404);
  check('Ban with a missing body field -> 400', (await request('PATCH', banPath, { token: adminToken, body: {} })).status === 400);
  check('Admin cannot ban themselves -> 400', (await request('PATCH', `/users/${adminId}/ban`, { token: adminToken, body: { isBanned: true } })).status === 400);

  const banned = await request('PATCH', banPath, { token: adminToken, body: { isBanned: true } });
  check('Admin bans the target -> 200 and isBanned is true', banned.status === 200 && banned.data?.data?.isBanned === true, JSON.stringify(banned.data));

  const refresh = await request('POST', '/auth/refresh', { cookie: target.cookie });
  check("Banned user's refresh token no longer works (401)", refresh.status === 401, `got ${refresh.status}`);

  const bannedLogin = await request('POST', '/auth/login', { body: { email: target.email, password: PASSWORD } });
  check('Banned user cannot log in (any 4xx)', bannedLogin.status >= 400 && bannedLogin.status < 500,
    `got ${bannedLogin.status}: if 200, auth.service.js does not check isBanned: paste that file`);

  const unbanned = await request('PATCH', banPath, { token: adminToken, body: { isBanned: false } });
  check('Admin unbans the target -> 200', unbanned.status === 200 && unbanned.data?.data?.isBanned === false);
  const againLogin = await request('POST', '/auth/login', { body: { email: target.email, password: PASSWORD } });
  check('Unbanned user can log in again', againLogin.status === 200, `got ${againLogin.status}`);

  // --- role ---
  const rolePath = `/users/${target.userId}/role`;
  check('Role change as a normal user -> 403', (await request('PATCH', rolePath, { token: other.token, body: { role: 'OWNER' } })).status === 403);
  check('Promoting to ADMIN through the API is rejected (400)', (await request('PATCH', rolePath, { token: adminToken, body: { role: 'ADMIN' } })).status === 400);
  check('Admin cannot change their own role -> 400', (await request('PATCH', `/users/${adminId}/role`, { token: adminToken, body: { role: 'USER' } })).status === 400);

  const promoted = await request('PATCH', rolePath, { token: adminToken, body: { role: 'OWNER' } });
  check('Admin makes the target an OWNER -> 200', promoted.status === 200 && promoted.data?.data?.role === 'OWNER', JSON.stringify(promoted.data));
  const demoted = await request('PATCH', rolePath, { token: adminToken, body: { role: 'USER' } });
  check('Admin sets the target back to USER -> 200', demoted.status === 200 && demoted.data?.data?.role === 'USER');

  // --- pending venues include who submitted them ---
  const venue = await request('POST', '/venues', {
    token: target.token,
    body: { name: 'Admin Test Hall', address: '5 Admin Road', city: 'Kozhikode', state: 'Kerala', pincode: '673001', capacity: 40, pricePerDay: 2500 },
  });
  const venueId = venue.data?.data?.id;
  check('Target submitted a venue', venue.status === 201 && Boolean(venueId), JSON.stringify(venue.data));

  const pending = await request('GET', '/venues/pending', { token: adminToken });
  const pv = (pending.data?.data || []).find((v) => v.id === venueId);
  check('Pending list includes the new venue with its owner name/email', Boolean(pv && pv.owner && pv.owner.email === target.email), JSON.stringify(pv));

  const rejected = await request('PATCH', `/venues/${venueId}/review`, { token: adminToken, body: { status: 'SUSPENDED' } });
  check('Admin rejects it (SUSPENDED) -> 200', rejected.status === 200 && rejected.data?.data?.status === 'SUSPENDED', JSON.stringify(rejected.data));
  const pending2 = await request('GET', '/venues/pending', { token: adminToken });
  check('Rejected venue leaves the pending list', !(pending2.data?.data || []).some((v) => v.id === venueId));

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})().catch((err) => {
  console.error('FAIL: script crashed:', err);
  process.exitCode = 1;
});