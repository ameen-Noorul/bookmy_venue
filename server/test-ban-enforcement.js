// Run with API on port 5000: node test-ban-enforcement.js
const BASE = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const setBan = (id, isBanned) => ({
  method: 'PATCH',
  path: `/users/${id}/ban`,
  body: { isBanned },
});

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`);
  ok ? pass++ : fail++;
};

async function call(method, path, { token, body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch {}
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return { status: res.status, json, setCookie };
}

const pick = (j, k) => j?.[k] ?? j?.data?.[k];

(async () => {
  const admin = await call('POST', '/auth/login', {
    body: { email: 'test@example.com', password: 'password123' },
  });
  const adminToken = pick(admin.json, 'accessToken');
  check('admin login', admin.status === 200 && !!adminToken, JSON.stringify(admin.json));

  const email = `ban-${Date.now()}@example.com`;
  const reg = await call('POST', '/auth/register', {
    body: { email, password: 'password123', name: 'Ban Test' },
  });
  const user = pick(reg.json, 'user');
  const token = pick(reg.json, 'accessToken');
  const cookie = (reg.setCookie[0] || '').split(';')[0];
  check('register test user', reg.status === 201 || reg.status === 200, JSON.stringify(reg.json));

  let r = await call('GET', '/bookings/mine', { token });
  check('before ban: /bookings/mine -> 200', r.status === 200, `got ${r.status}`);

  let b = setBan(user.id, true);
  r = await call(b.method, b.path, { token: adminToken, body: b.body });
  check('admin bans user', r.status === 200, `got ${r.status} ${JSON.stringify(r.json)}`);

  r = await call('GET', '/bookings/mine', { token });
  check('after ban: SAME token -> 403', r.status === 403, `got ${r.status}`);

  r = await call('POST', '/auth/login', { body: { email, password: 'password123' } });
  check('after ban: login -> 403', r.status === 403, `got ${r.status}`);

  r = await call('POST', '/auth/refresh', { cookie });
  check('after ban: refresh rejected', r.status >= 400, `got ${r.status}`);

  b = setBan(user.id, false);
  r = await call(b.method, b.path, { token: adminToken, body: b.body });
  check('admin unbans user', r.status === 200, `got ${r.status} ${JSON.stringify(r.json)}`);

  r = await call('GET', '/bookings/mine', { token });
  check('after unban: old token -> 200 again', r.status === 200, `got ${r.status}`);

  r = await call('POST', '/auth/login', { body: { email, password: 'password123' } });
  check('after unban: login -> 200', r.status === 200, `got ${r.status}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})();