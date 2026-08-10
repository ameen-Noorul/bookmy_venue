// One Redis connection shared across the whole application.
//
// Anything that needs data shared between multiple server instances
// (idempotency, caching, rate limiting, sessions, etc.) should use
// this client instead of storing data in local memory.
const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Never crash the app because Redis has a temporary problem.
// Just log the error so it can be investigated.
redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

module.exports = redisClient;