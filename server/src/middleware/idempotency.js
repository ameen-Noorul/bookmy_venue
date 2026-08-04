// A simple in-memory store: key -> the response we already sent back.
// HONEST LIMITATION: this only works as long as your server keeps running.
// If the server restarts, this memory is wiped. A real production setup
// would store this in Redis or a database table instead, so it survives
// restarts and works even if you run multiple copies of your server. For
// today's MVP, in-memory is enough to prove the concept.
const seenRequests = new Map();

const idempotency = (req, res, next) => {
  const key = req.headers['idempotency-key'];

  // If the client didn't send a key at all, just let the request through
  // normally — idempotency is opt-in here, not forced.
  if (!key) return next();

  const cached = seenRequests.get(key);
  if (cached) {
    // We've seen this exact key before — return the SAME response we sent
    // the first time, instead of running the booking logic again.
    return res.status(cached.status).json(cached.body);
  }

  // Not seen before: let the request run normally, but grab a copy of
  // whatever response gets sent, so we can remember it for next time.
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    seenRequests.set(key, { status: res.statusCode, body });
    return originalJson(body);
  };

  next();
};

module.exports = idempotency;