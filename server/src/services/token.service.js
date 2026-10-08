const crypto = require('crypto');
const prisma = require('../db/prismaClient'); // matches your actual path from auth.service.js
const { signAccessToken } = require('../utils/tokens');

const REFRESH_TOKEN_TTL_DAYS = 7;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueRefreshToken(userId, familyId = null) {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const family = familyId || crypto.randomUUID();

  await prisma.refreshToken.create({
    data: { userId, tokenHash, familyId: family, expiresAt }
  });

  return { rawToken, familyId: family };
}

async function rotateRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  if (existing.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { familyId: existing.familyId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    throw new Error('REFRESH_REUSE_DETECTED');
  }

  if (existing.expiresAt < new Date()) {
    throw new Error('REFRESH_TOKEN_EXPIRED');
  }

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() }
  });

  const { rawToken: newRawToken } = await issueRefreshToken(existing.userId, existing.familyId);

  const user = await prisma.user.findUnique({ where: { id: existing.userId } });
  const newAccessToken = signAccessToken(user); // reuses the ONE real access-token signer

  return { accessToken: newAccessToken, refreshToken: newRawToken };
}

async function revokeFamily(rawToken) {
  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (existing) {
    await prisma.refreshToken.updateMany({
      where: { familyId: existing.familyId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }
}

module.exports = { issueRefreshToken, rotateRefreshToken, revokeFamily };