const bcrypt = require('bcryptjs');
const prisma = require('../db/prismaClient');
const AppError = require('../utils/AppError');
const { signAccessToken, signRefreshToken } = require('../utils/tokens');

async function register({ email, password, name }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  // NEVER store plain-text passwords. bcrypt.hash() runs the password
  // through a one-way scrambling algorithm — you can check a password
  // against a hash, but you can't reverse a hash back into the password.
  // The "10" is the salt round count: how many times the algorithm repeats
  // internally. Higher = slower to compute = harder to brute-force, but also
  // slower for legitimate logins. 10 is a solid, industry-standard default.
  const hashedPassword = await bcrypt.hash(password, 10);

  // Every new account starts as USER, no exceptions. OWNER is only ever
  // granted by the server itself, as a side effect of an ADMIN approving
  // that user's submitted venue — see venue.service.js's reviewVenue().
  // ADMIN is never created through this endpoint at all — see the README's
  // bootstrap step.
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, role: 'USER' },
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // Never return the password hash to the client, even hashed.
  const { password: _omit, ...safeUser } = user;

  return { user: safeUser, accessToken, refreshToken };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Deliberately vague error message ("wrong email or password") instead of
  // "no account with that email" — this stops an attacker from using your
  // login endpoint to figure out which emails are registered.
  if (!user) {
    throw new AppError('Wrong email or password', 400);
  }

  // bcrypt.compare hashes the submitted password the SAME way and checks if
  // it matches the stored hash — it never "reverses" the stored hash.
  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new AppError('Wrong email or password', 400);
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const { password: _omit, ...safeUser } = user;

  return { user: safeUser, accessToken, refreshToken };
}

module.exports = { register, login };