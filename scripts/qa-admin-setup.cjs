// QA setup: a throwaway ADMIN (role ADMIN). Cleanup: qa-cleanup-all.cjs.
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  const ts = Date.now();
  const password = `Qa!${ts}`;
  const u = await prisma.user.create({
    data: {
      username: `qa_admin_${ts}`, email: `qa-admin-${ts}@inkverse.test`,
      passwordHash: await bcrypt.hash(password, 10), role: "ADMIN", emailVerified: new Date(),
    },
  });
  console.log(JSON.stringify({ email: u.email, password, id: u.id }));
  await prisma.$disconnect();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
