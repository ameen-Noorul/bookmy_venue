const http = require('http');

const ORIGIN = 'http://localhost:3000';
let passed = 0, failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`);
  ok ? passed++ : failed++;
};

// Plain http so we can set the Origin header exactly like a browser does.
function send(method, path, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: 'localhost', port: 5000, path, method, headers: { 'Content-Type': 'application/json', ...headers } },
      (res) => {
        res.resume();
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  const pre = await send('OPTIONS', '/api/v1/auth/login', {
    Origin: ORIGIN,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type,authorization',
  });
  check('Preflight allows the client origin', pre.headers['access-control-allow-origin'] === ORIGIN, JSON.stringify(pre.headers));
  check('Preflight allows credentials (needed for the refresh cookie)', pre.headers['access-control-allow-credentials'] === 'true', 'missing Access-Control-Allow-Credentials');

  const login = await send('POST', '/api/v1/auth/login', { Origin: ORIGIN }, JSON.stringify({ email: 'nobody@test.com', password: 'wrongpass' }));
  check('Real response (even an error) carries Allow-Credentials, so the browser can read it', login.headers['access-control-allow-credentials'] === 'true', `status ${login.status}`);

  const evil = await send('POST', '/api/v1/auth/login', { Origin: 'http://evil.example.com' }, JSON.stringify({ email: 'a@b.com', password: 'x' }));
  check('A different origin is NOT allowed', evil.headers['access-control-allow-origin'] !== 'http://evil.example.com');

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})();