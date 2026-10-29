// Run with API on port 5000 after seeding: node test-seed-data.js
const BASE = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const SEEDED = [
  'Marine Drive Grand Ballroom', 'Backwater Lawn Resort', 'Hill View Convention Hall',
  'Malabar Palace Banquet', 'Capital Courtyard', 'Pooram Pavilion', 'Fort Garden Events',
  'Palakkad Gap Hall', 'Rubber Estate Resort', 'Tirur Celebration Centre',
];
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`);
  ok ? pass++ : fail++;
};

const findArray = (j, depth = 0) => {
  if (Array.isArray(j)) return j;
  if (j === null || typeof j !== 'object' || depth > 4) return null;
  for (const v of Object.values(j)) {
    const a = findArray(v, depth + 1);
    if (a) return a;
  }
  return null;
};

const login = (email) =>
  fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  });

(async () => {
  for (const email of ['test@example.com', 'owner@example.com', 'owner2@example.com', 'customer@example.com']) {
    const r = await login(email);
    check(`login ${email}`, r.status === 200, `got ${r.status}`);
  }

  // Walk every page of GET /venues (max limit is 50 on this API).
  const found = new Map();
  let totalListed = 0;
  let status = 0;
  for (let page = 1; page <= 40; page++) {
    const res = await fetch(`${BASE}/venues?limit=50&page=${page}`);
    status = res.status;
    if (res.status !== 200) break;
    const j = await res.json().catch(() => ({}));
    const arr = j.venues || findArray(j) || [];
    if (arr.length === 0) break;
    totalListed += arr.length;
    arr.forEach((v) => found.set(v.name, v));
    const tp = j.pagination?.totalPages;
    if (tp && page >= tp) break;
  }
  check('GET /venues -> 200', status === 200, `got ${status}`);
  console.log(`      (walked ${totalListed} venues in the public list)`);

  const missing = SEEDED.filter((n) => !found.has(n));
  check('all 10 seeded venues appear in the public list', missing.length === 0, `missing: ${missing.join(', ')}`);
  const badPhotos = SEEDED.filter((n) => (found.get(n)?.photos || []).length !== 3);
  check('each seeded venue has 3 photos', badPhotos.length === 0, `bad: ${badPhotos.join(', ')}`);

  const c = await (await login('customer@example.com')).json();
  const token = c.accessToken ?? c.data?.accessToken;
  const mine = await fetch(`${BASE}/bookings/mine`, { headers: { Authorization: `Bearer ${token}` } });
  const bookings = findArray(await mine.json().catch(() => ({}))) || [];
  check('customer has 4 sample bookings', bookings.length >= 4, `got ${bookings.length}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})();