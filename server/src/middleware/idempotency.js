const redisClient = require('../config/redis');

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;
const PENDING = '__pending__';
const CACHEABLE_STATUS_CODES = new Set([200, 201, 202, 204, 409]);

const idempotency = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  if (!key) return next();

  const redisKey = `idempotency:${key}`;

  let claimed;
  try {
    claimed = await redisClient.set(redisKey, PENDING, {
      NX: true,
      EX: IDEMPOTENCY_TTL_SECONDS,
    });
  } catch (err) {
    console.error('Idempotency check failed, proceeding without it:', err);
    return next();
  }

  if (!claimed) {
    let existing;
    try {
      existing = await redisClient.get(redisKey);
    } catch (err) {
      console.error('Idempotency lookup failed, proceeding without it:', err);
      return next();
    }

    if (existing === PENDING) {
      return res.status(409).json({
        error: 'A request with this idempotency key is already being processed',
      });
    }

    const { status, body } = JSON.parse(existing);
    return res.status(status).json(body);
  }

  // res.json() calls res.send() internally in Express — so both overrides
  // below would otherwise fire for a single response, with the second
  // (res.send, receiving already-stringified text) silently overwriting
  // the first (res.json, receiving the real object). This flag makes sure
  // we only ever save the FIRST body we see per request — whichever
  // fires first is the real one.
  let alreadySaved = false;
  const saveResult = (status, body) => {
    if (alreadySaved) return;
    alreadySaved = true;

    if (CACHEABLE_STATUS_CODES.has(status)) {
      redisClient
        .set(redisKey, JSON.stringify({ status, body }), { EX: IDEMPOTENCY_TTL_SECONDS })
        .catch((err) => console.error('Failed to save idempotency result:', err));
    } else {
      redisClient.del(redisKey).catch((err) => console.error('Failed to release idempotency key:', err));
    }
  };

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    saveResult(res.statusCode, body);
    return originalJson(body);
  };

  const originalSend = res.send.bind(res);
  res.send = (body) => {
    saveResult(res.statusCode, body);
    return originalSend(body);
  };

  next();
};

module.exports = idempotency;