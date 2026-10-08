const jwt = require('jsonwebtoken');
const config = require('../config');

const signAccessToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry,
  });

module.exports = { signAccessToken }; // signRefreshToken removed — replaced by token.service.js