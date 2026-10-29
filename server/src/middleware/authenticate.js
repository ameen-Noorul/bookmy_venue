// Answers one question: "is there a valid login token on this request, and
// who does it belong to?" What the user may DO is decided in authorize.js.

const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const config = require('../config');
const prisma = require('../db/prismaClient');

const authenticate = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Please log in first', 401));
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.accessSecret);
  } catch (err) {
    return next(new AppError('Invalid or expired token', 401));
  }

  // The token only proves who they were when it was issued, so re-fetch
  // the real user: they may have been deleted or banned since.
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });

  if (!user) {
    return next(new AppError('User no longer exists', 401));
  }

  // Banned users are cut off immediately, even with a still-valid token.
  if (user.isBanned) {
    return next(new AppError('This account has been suspended', 403));
  }

  req.user = user;
  next();
});

module.exports = authenticate;