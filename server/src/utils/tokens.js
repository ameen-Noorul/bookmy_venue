const jwt = require('jsonwebtoken');
const config = require('../config');

// A JWT (JSON Web Token) packs a small amount of data (here: user id and
// role) into a signed string. "Signed" means our server can later verify the
// token wasn't tampered with, without needing to look anything up — the
// signature itself proves authenticity.
const signAccessToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry,
  });

const signRefreshToken = (user) =>
  jwt.sign({ id: user.id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry,
  });

module.exports = { signAccessToken, signRefreshToken };