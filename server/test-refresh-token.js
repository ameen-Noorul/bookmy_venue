// Tests refresh token rotation + reuse detection + logout, end-to-end.
// Run with: node test-refresh-token.js

const BASE_URL = 'http://localhost:5000/api/v1';

let passCount = 0;
let failCount = 0;

function check(label, condition, extra = '') {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passCount++;
  } else {
    console.log(`❌ FAIL: ${label} ${extra}`);
    failCount++;
  }
}

// Returns every Set-Cookie header on the response.
function getSetCookieHeaders(res) {
  return res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie')].filter(Boolean);
}

// Extracts just the "refreshToken=xxx" value from a Set-Cookie header,
// ignoring the other attributes (HttpOnly, Path, Max-Age, etc).
function extractCookie(res, cookieName) {
  for (const header of getSetCookieHeaders(res)) {
    const match = header.match(new RegExp(`${cookieName}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

// Returns the full raw Set-Cookie header for a cookie (including Path=...).
function extractRawCookieHeader(res, cookieName) {
  return getSetCookieHeaders(res).find((h) => h.startsWith(`${cookieName}=`)) || null;
}

async function request(method, path, { token, body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = `refreshToken=${cookie}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body on some responses
  }

  const newCookie = extractCookie(res, 'refreshToken');
  const rawCookieHeader = extractRawCookieHeader(res, 'refreshToken');

  return { status: res.status, data, cookie: newCookie, rawCookieHeader, rawRes: res };
}

async function main() {
  const suffix = Date.now();
  const email = `refreshtest_${suffix}@test.com`;
  const password = 'password123';

  // Step 1: register, capture the initial refresh cookie
  const registerRes = await request('POST', '/auth/register', {
    body: { email, password, name: 'Refresh Test' },
  });
  const accessToken1 = registerRes.data?.data?.accessToken;
  const refreshCookie1 = registerRes.cookie;
  check(
    'Register returns accessToken + sets refreshToken cookie',
    !!accessToken1 && !!refreshCookie1,
    JSON.stringify(registerRes.data)
  );

  // Step 1b: the cookie's Path must cover the versioned auth routes,
  // otherwise a real browser would never send it to /api/v1/auth/refresh.
  check(
    'Refresh cookie Path is /api/v1/auth (browser will send it to refresh + logout)',
    !!registerRes.rawCookieHeader && /Path=\/api\/v1\/auth(;|$)/i.test(registerRes.rawCookieHeader),
    registerRes.rawCookieHeader || 'no Set-Cookie header found'
  );

  // Step 2: call /auth/refresh with that cookie — should get a NEW accessToken + NEW cookie
  const refreshRes1 = await request('POST', '/auth/refresh', { cookie: refreshCookie1 });
  const accessToken2 = refreshRes1.data?.data?.accessToken;
  const refreshCookie2 = refreshRes1.cookie;
  check(
    'First refresh succeeds with new accessToken + new cookie',
    refreshRes1.status === 200 && !!accessToken2 && !!refreshCookie2 && refreshCookie2 !== refreshCookie1,
    JSON.stringify(refreshRes1.data)
  );

  // Step 3: reuse the OLD (already-rotated) refresh token — should be rejected
  // AND should trigger reuse-detection, revoking the entire token family.
  const reuseRes = await request('POST', '/auth/refresh', { cookie: refreshCookie1 });
  check(
    'Reusing old rotated token is rejected (401)',
    reuseRes.status === 401,
    `got ${reuseRes.status} ${JSON.stringify(reuseRes.data)}`
  );

  // Step 4: because reuse was detected, even the CURRENT valid cookie (refreshCookie2)
  // should now be dead too — the whole family got revoked as a security measure.
  const afterReuseRes = await request('POST', '/auth/refresh', { cookie: refreshCookie2 });
  check(
    'Reuse detection revoked the entire token family (current cookie also now invalid)',
    afterReuseRes.status === 401,
    `got ${afterReuseRes.status} ${JSON.stringify(afterReuseRes.data)}`
  );

  // Step 5: fresh login to test logout cleanly (previous family is now fully dead)
  const loginRes = await request('POST', '/auth/login', { body: { email, password } });
  const loginCookie = loginRes.cookie;
  check('Fresh login after family revocation works', loginRes.status === 200 && !!loginCookie);

  // Step 6: logout should revoke it
  const logoutRes = await request('POST', '/auth/logout', { cookie: loginCookie });
  check('Logout succeeds', logoutRes.status === 200, JSON.stringify(logoutRes.data));

  // Step 7: using that same cookie after logout should now fail
  const afterLogoutRes = await request('POST', '/auth/refresh', { cookie: loginCookie });
  check(
    'Refresh token is dead after logout (401)',
    afterLogoutRes.status === 401,
    `got ${afterLogoutRes.status}`
  );

  printSummary();
}

function printSummary() {
  console.log('\n----------------------------------------');
  console.log(`${passCount} passed, ${failCount} failed`);
  console.log('----------------------------------------');
}

main().catch((err) => {
  console.error('Script crashed:', err);
});