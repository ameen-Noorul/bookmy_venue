const prisma = require('../db/prismaClient');
const AppError = require('../utils/AppError');

// Never return the password hash.
const publicUser = {
  id: true,
  email: true,
  name: true,
  role: true,
  isBanned: true,
  isVerified: true,
  createdAt: true,
};

async function listUsers({ page = 1, limit = 20, search } = {}) {
  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: publicUser,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function findOrThrow(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);
  return user;
}

async function setBanned(targetId, isBanned, adminId) {
  if (targetId === adminId) throw new AppError('You cannot ban yourself', 400);
  const target = await findOrThrow(targetId);
  if (target.role === 'ADMIN') throw new AppError('Admin accounts cannot be banned', 403);

  // Banning also kills every active login session of that user.
  const ops = [
    prisma.user.update({ where: { id: targetId }, data: { isBanned }, select: publicUser }),
  ];
  if (isBanned) {
    ops.push(
      prisma.refreshToken.updateMany({
        where: { userId: targetId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    );
  }
  const [user] = await prisma.$transaction(ops);
  return user;
}

async function setRole(targetId, role, adminId) {
  if (targetId === adminId) throw new AppError('You cannot change your own role', 400);
  const target = await findOrThrow(targetId);
  if (target.role === 'ADMIN') throw new AppError('Admin roles cannot be changed here', 403);

  return prisma.user.update({ where: { id: targetId }, data: { role }, select: publicUser });
}

module.exports = { listUsers, setBanned, setRole };