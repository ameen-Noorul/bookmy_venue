const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("password123", 10);
  const admin = await prisma.user.update({
    where: { email: "test@example.com" },
    data: { password: hash, role: "ADMIN" },
  });
  console.log("Password reset for:", admin.email, "→ role:", admin.role);
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
