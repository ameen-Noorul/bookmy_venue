const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Promote existing test user to ADMIN
  const admin = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: { role: 'ADMIN' },
    create: {
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Test Admin',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin ready:', admin.email, '→', admin.role);

  // Create an OWNER test account
  const owner = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: { role: 'OWNER' },
    create: {
      email: 'owner@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Test Owner',
      role: 'OWNER',
    },
  });
  console.log('✅ Owner ready:', owner.email, '→', owner.role);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });