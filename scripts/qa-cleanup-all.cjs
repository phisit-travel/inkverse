// Delete ALL throwaway QA accounts (email like qa-*@inkverse.test) and cascade.
// Tightly scoped to the synthetic test domain so it can never touch real users.
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  const where = { email: { startsWith: "qa-", endsWith: "@inkverse.test" } };
  const victims = await prisma.user.findMany({ where, select: { id: true, email: true } });
  console.log("deleting", victims.length, "qa users");
  const r = await prisma.user.deleteMany({ where });
  console.log("DELETED users:", r.count);
  await prisma.$disconnect();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
