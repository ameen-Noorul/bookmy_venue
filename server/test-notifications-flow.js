const { io } = require('socket.io-client');
const { notificationQueue, connection } = require('./src/queues/notification.queue');

const BASE = process.env.BASE_URL || 'http://localhost:5000';
const API = `${BASE}/api/v1`;
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
const idFromToken = (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()).id;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Poll GET /notifications/mine until a notification containing `text` shows up.
async function waitForNotification(token, text, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const r = await request('GET', '/notifications/mine', { token });
    const found = (r.data?.data || []).find((n) => n.message.includes(text));
    if (found) return { found, list: r.data.data };
    await sleep(400);
  }
  return { found: null, list: [] };
}

function waitForEvent(socket, event, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once(event, (p) => { clearTimeout(timer); resolve(p); });
  });
}

(async () => {
  const suffix = Date.now();
  const password = 'password123';

  // 1. Make a real OWNER: register, create venue, admin approves, log in again.
  const ownerEmail = `nf-owner-${suffix}@test.com`;
  await request('POST', '/auth/register', { body: { email: ownerEmail, password, name: 'NF Owner' } });
  let ownerLogin = await request('POST', '/auth/login', { body: { email: ownerEmail, password } });
  const firstToken = tokenOf(ownerLogin);

  const venue = await request('POST', '/venues', {
    token: firstToken,
    body: { name: 'NF Hall', address: '1 Notify Road', city: 'Kozhikode', state: 'Kerala', pincode: '673001', capacity: 80, pricePerDay: 4000 },
  });
  const venueId = venue.data?.data?.id;
  const admin = await request('POST', '/auth/login', { body: { email: 'test@example.com', password } });
  const adminToken = tokenOf(admin);
  const review = await request('PATCH', `/venues/${venueId}/review`, { token: adminToken, body: { status: 'ACTIVE' } });
  check('Venue approved (user becomes OWNER)', review.status === 200, JSON.stringify(review.data));

  ownerLogin = await request('POST', '/auth/login', { body: { email: ownerEmail, password } });
  const ownerToken = tokenOf(ownerLogin);
  check('Owner logged in', Boolean(ownerToken));
  if (!ownerToken) { process.exitCode = 1; return; }
  const ownerId = idFromToken(ownerToken);

  // 2. Owner OFFLINE: notification is saved and comes back from the REST endpoint.
  await notificationQueue.add('notify-owner-booking', { ownerId, venueName: 'Offline Hall', eventDate: new Date().toISOString() });
  const offline = await waitForNotification(ownerToken, 'Offline Hall');
  check('Notification created while owner was offline is returned by GET /notifications/mine', Boolean(offline.found), 'is the worker running?');

  // 3. Owner ONLINE: the same pipeline pushes it live AND it appears in the REST list.
  const socket = await new Promise((resolve, reject) => {
    const s = io(BASE, { auth: { token: ownerToken }, transports: ['websocket'], reconnection: false });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
    setTimeout(() => reject(new Error('connect timeout')), 4000);
  });
  check('Owner socket connected', socket.connected);

  const live = waitForEvent(socket, 'notification:new', 8000);
  await notificationQueue.add('notify-owner-booking', { ownerId, venueName: 'Live Hall', eventDate: new Date().toISOString() });
  const pushed = await live;
  check('Owner receives the live push', Boolean(pushed && /Live Hall/.test(pushed.message)), JSON.stringify(pushed));

  const after = await waitForNotification(ownerToken, 'Live Hall');
  check('Pushed notification has the same id as the one in the REST list', Boolean(pushed && after.found && after.found.id === pushed.id));
  check('REST list is newest first (Live Hall before Offline Hall)', after.list[0] && /Live Hall/.test(after.list[0].message), JSON.stringify(after.list.map((n) => n.message)));

  // 4. A normal user is not allowed to read notifications.
  const strangerEmail = `nf-user-${suffix}@test.com`;
  await request('POST', '/auth/register', { body: { email: strangerEmail, password, name: 'NF User' } });
  const stranger = await request('POST', '/auth/login', { body: { email: strangerEmail, password } });
  const denied = await request('GET', '/notifications/mine', { token: tokenOf(stranger) });
  check('Non-owner cannot read notifications (403)', denied.status === 403, `got ${denied.status}`);

  socket.close();
  await notificationQueue.close();
  connection.disconnect();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})().catch((err) => {
  console.error('FAIL: script crashed:', err);
  process.exitCode = 1;
});