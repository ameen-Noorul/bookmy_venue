// Again, a simple in-memory cache for the MVP. HONEST LIMITATION: same as
// idempotency — this resets if the server restarts, and doesn't share
// between multiple server copies. Real production apps use Redis for this
// exact reason. In-memory is fine to prove the concept today.
const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;

  // Check if this cached value has "expired" (gone stale).
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// Wipes EVERYTHING cached. We call this whenever a venue changes (submitted,
// approved, rejected) so nobody keeps seeing stale data after a real change.
function clear() {
  store.clear();
}

module.exports = { get, set, clear };