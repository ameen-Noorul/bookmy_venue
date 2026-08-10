// Prisma recommends creating exactly ONE PrismaClient instance and reusing it
// everywhere, instead of creating a new one in every file. Each instance opens
// its own pool of database connections — creating many of them can exhaust
// your database's connection limit.
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
