// Creates test@example.com / password123 as ADMIN if missing.
// If the user already exists, only makes sure the role is ADMIN and not banned;
// the password is never touched.
const bcrypt = require('bcryptjs');
const prisma = require('../src/db/prismaClient');

(async () => {
  const email = 'test@example.com';
  const hash = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', isBanned: false },
    create: { email, password: hash, name: 'Test Admin', role: 'ADMIN' },
  });
  console.log('Test admin ready:', email);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });