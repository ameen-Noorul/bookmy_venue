// This middleware answers exactly one question: "is there a valid, unexpired
// login token attached to this request, and if so, who does it belong to?"
// It does NOT decide what that user is allowed to do — that's authorize.js.

const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const config = require('../config');
const prisma = require('../db/prismaClient');

const authenticate = catchAsync(async (req, res, next) => {
  // Tokens are sent in the Authorization header as: "Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Please log in first', 401));
  }

  const token = authHeader.split(' ')[1]; // "Bearer abc123" -> "abc123"

  let decoded;
  try {
    // jwt.verify checks TWO things at once: (1) the token's signature is
    // valid — meaning it was really issued by our server and not forged or
    // tampered with, and (2) it hasn't expired (the `exp` field baked into
    // the token). If either check fails, it throws, which we catch below.
    decoded = jwt.verify(token, config.jwt.accessSecret);
  } catch (err) {
    return next(new AppError('Invalid or expired token', 401));
  }

  // The token only carries the user's id and role — it does NOT guarantee
  // the user still exists (e.g. their account could've been deleted after
  // the token was issued). So we re-fetch the real user from the database.
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });

  if (!user) {
    return next(new AppError('User no longer exists', 401));
  }

  // Attach the user to the request so every later middleware/controller can
  // read req.user without re-fetching or re-decoding anything.
  req.user = user;
  next();
});

module.exports = authenticate;