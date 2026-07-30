// This file's job: read process.env once, check nothing important is missing,
// and export a clean config object so the rest of the app never touches
// process.env directly. That makes it easy to see every config value your
// app depends on in one place.

require('dotenv').config();

const requiredEnvVars = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    // Fail fast — better to crash immediately on startup with a clear message
    // than to run in a broken state and fail confusingly later.
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
};