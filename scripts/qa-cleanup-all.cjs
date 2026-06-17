// Delete ALL throwaway QA accounts (email like qa-*@inkverse.test) and cascade.
// Tightly scoped to the synthetic test domain so it can never touch real users.
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  // QA test manga don't cascade when their creator user is deleted, so remove
  // them explicitly first (tightly scoped to the synthetic "ทดสอบ QA" prefix).
  const mr = await prisma.manga.deleteMany({ where: { title: { startsWith: "ทดสอบ QA" } } });
  console.log("DELETED qa manga:", mr.count);

  const where = { email: { startsWith: "qa-", endsWith: "@inkverse.test" } };
  const victims = await prisma.user.findMany({ where, select: { id: true, email: true } });
  console.log("deleting", victims.length, "qa users");
  const r = await prisma.user.deleteMany({ where });
  console.log("DELETED users:", r.count);
  await prisma.$disconnect();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
