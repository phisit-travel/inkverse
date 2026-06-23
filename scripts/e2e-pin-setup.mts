// Throwaway e2e fixtures for the PIN login gate. Creates two DEV users:
//   e2e-pin@test.local   — password "password123", PIN "123456"  (gated)
//   e2e-nopin@test.local — password "password123", no PIN        (not gated)
// Run: node --import tsx scripts/e2e-pin-setup.mts   (DATABASE_URL from .env.local)
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";

// Load DATABASE_URL from .env.local without printing it.
if (!process.env.DATABASE_URL) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^DATABASE_URL=(.*)$/);
    if (m) process.env.DATABASE_URL = m[1];
  }
}

const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function upsert(email: string, username: string, withPin: boolean) {
  const passwordHash = await bcrypt.hash("password123", 10);
  const pinHash = withPin ? await bcrypt.hash("123456", 10) : null;
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, pinHash, emailVerified: new Date() },
    create: {
      email,
      username,
      passwordHash,
      pinHash,
      emailVerified: new Date(),
      role: "READER",
    },
    select: { id: true, email: true, pinHash: true },
  });
  // Clear any stale sessions so each run starts fresh (no leftover pinVerifiedAt).
  await prisma.userSession.deleteMany({ where: { userId: user.id } });
  console.log(`${user.email}  pin=${user.pinHash ? "yes" : "no"}`);
}

await upsert("e2e-pin@test.local", "e2epin", true);
await upsert("e2e-nopin@test.local", "e2enopin", false);
await prisma.$disconnect();
console.log("e2e fixtures ready");
