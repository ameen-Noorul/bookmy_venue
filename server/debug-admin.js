const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // 1. Check the DB directly — same client style the app uses
  const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });

  if (!user) {
    console.log('❌ No user found with that email in THIS database.');
    await prisma.$disconnect();
    return;
  }

  console.log('Found user:', user.email, '| role:', user.role);
  console.log('Password hash in DB:', user.password);

  const matches = await bcrypt.compare('password123', user.password);
  console.log('Does "password123" match this hash?', matches);

  await prisma.$disconnect();

  // 2. Now hit the real HTTP login endpoint and compare
  const res = await fetch('http://localhost:5000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
  });
  const data = await res.json();
  console.log('\nHTTP /auth/login status:', res.status);
  console.log('HTTP /auth/login body:', JSON.stringify(data));
}

main();