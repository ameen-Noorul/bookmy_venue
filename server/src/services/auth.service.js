const bcrypt = require('bcryptjs');
const prisma = require('../db/prismaClient');
const AppError = require('../utils/AppError');
const { signAccessToken } = require('../utils/tokens');
const { issueRefreshToken } = require('./token.service');

async function register({ email, password, name }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, role: 'USER' },
  });

  const accessToken = signAccessToken(user);
  const { rawToken: refreshToken } = await issueRefreshToken(user.id);

  const { password: _omit, ...safeUser } = user;

  return { user: safeUser, accessToken, refreshToken };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError('Wrong email or password', 400);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new AppError('Wrong email or password', 400);
  }

  const accessToken = signAccessToken(user);
  const { rawToken: refreshToken } = await issueRefreshToken(user.id);

  const { password: _omit, ...safeUser } = user;

  return { user: safeUser, accessToken, refreshToken };
}

module.exports = { register, login };