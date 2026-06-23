/**
 * Mark a user as identity-verified (sets User.verifiedAt = now) — e.g. the
 * official INKVERSE account. Pass --undo to clear it.
 *
 * Run:  $env:DATABASE_URL = Read-Host "prod url"
 *       npx tsx scripts/verify-user.mts <username> [--undo]
 *       $env:DATABASE_URL = $null
 */
import { prisma } from "../lib/prisma";

const username = process.argv[2];
const undo = process.argv.includes("--undo");
if (!username) {
  console.error("usage: npx tsx scripts/verify-user.mts <username> [--undo]");
  process.exit(1);
}

try {
  const u = await prisma.user.update({
    where: { username },
    data: { verifiedAt: undo ? null : new Date() },
    select: { username: true, verifiedAt: true, role: true },
  });
  console.log(`✓ ${u.username} — verifiedAt = ${u.verifiedAt ? u.verifiedAt.toISOString() : "null (cleared)"}`);
} catch (e) {
  console.error(`ไม่สำเร็จ: ${(e as Error).message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
