/**
 * Delete UserSession (device) rows — cleanup for the backfill bug that created
 * duplicate sessions. Affected users get logged out within ~60s (their token's
 * sid no longer resolves) and re-register a single clean session on next login.
 *
 * Run:  $env:DATABASE_URL="<prod url>"; npx tsx scripts/clear-sessions.mts <username|--all>; $env:DATABASE_URL=$null
 */
import { prisma } from "../lib/prisma";

const arg = process.argv[2];
if (!arg) {
  console.error("usage: npx tsx scripts/clear-sessions.mts <username> | --all");
  process.exit(1);
}

let count: number;
if (arg === "--all") {
  count = (await prisma.userSession.deleteMany({})).count;
  console.log(`ลบ session ทั้งหมด: ${count} รายการ (ทุกคน login ใหม่ครั้งเดียว)`);
} else {
  const u = await prisma.user.findUnique({ where: { username: arg }, select: { id: true } });
  if (!u) { console.error(`ไม่พบผู้ใช้ "${arg}"`); process.exit(1); }
  count = (await prisma.userSession.deleteMany({ where: { userId: u.id } })).count;
  console.log(`ลบ session ของ ${arg}: ${count} รายการ`);
}
await prisma.$disconnect();
