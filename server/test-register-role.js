// Run with the API on port 5000: node test-register-role.js
const BASE = process.env.BASE_URL || 'http://localhost:5000/api/v1';
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`);
  ok ? pass++ : fail++;
};

const register = async (body) => {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, user: json.data?.user ?? json.user };
};

(async () => {
  const stamp = Date.now();
  const base = { password: 'password123', name: 'Role Test' };

  let r = await register({ ...base, email: `role-owner-${stamp}@example.com`, role: 'OWNER' });
  check('role OWNER creates an owner', r.status === 201 && r.user?.role === 'OWNER', `got ${r.status} ${r.user?.role}`);

  r = await register({ ...base, email: `role-user-${stamp}@example.com`, role: 'USER' });
  check('role USER creates a user', r.status === 201 && r.user?.role === 'USER', `got ${r.status} ${r.user?.role}`);

  r = await register({ ...base, email: `role-none-${stamp}@example.com` });
  check('no role defaults to user', r.status === 201 && r.user?.role === 'USER', `got ${r.status} ${r.user?.role}`);

  r = await register({ ...base, email: `role-admin-${stamp}@example.com`, role: 'ADMIN' });
  check('role ADMIN is rejected (400)', r.status === 400, `got ${r.status}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})();