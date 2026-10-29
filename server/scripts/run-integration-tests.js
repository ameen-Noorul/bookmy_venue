// Linux-safe sequential runner used by CI. Never runs tests in parallel.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const TESTS = [
  'test-versioning', 'test-errors', 'test-cors', 'test-rbac',
  'test-refresh-token', 'test-venue-routes', 'test-admin-routes',
  'test-ban-enforcement', 'test-booking-ownership', 'test-concurrent-booking',
  'test-docs', 'test-realtime', 'test-realtime-emit', 'test-worker-push',
  'test-notifications-flow',
];
// Excluded on purpose: test-booking.js (hard-coded local ids),
// test-realtime-cluster.js (needs the Docker stack).

function find(name) {
  return [`${name}.js`, `tests/${name}.js`, `src/${name}.js`]
    .map((p) => path.join(root, p))
    .find((p) => fs.existsSync(p));
}

const failed = [];
for (const name of TESTS) {
  const file = find(name);
  if (!file) { console.log(`\nSKIP  ${name} (file not found)`); continue; }
  console.log(`\n=== ${name} ===`);
  const r = spawnSync('node', [file], { cwd: root, stdio: 'inherit', env: process.env });
  if (r.status !== 0) failed.push(name);
}

console.log(`\n${failed.length ? 'FAILED: ' + failed.join(', ') : 'ALL INTEGRATION TESTS PASSED'}`);
process.exit(failed.length ? 1 : 0);