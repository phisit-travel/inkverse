/**
 * READ-ONLY audit: find existing usernames / display names / pen names that
 * contain a reserved (official-implying) term — using the SAME logic as the
 * live guard (lib/nameGuard). Flags whether each account is identity-verified
 * (verified = allowed to use the term; NOT verified = review / impersonation).
 *
 * Run:  $env:DATABASE_URL="<prod pooled url>"; npx tsx scripts/audit-names.mts; $env:DATABASE_URL=$null
 *   (or bash:  DATABASE_URL="..." npx tsx scripts/audit-names.mts )
 * Makes NO writes.
 */
import { prisma } from "../lib/prisma";
import { nameRequiresVerification } from "../lib/nameGuard";

const tag = (v: Date | null | undefined) => (v ? "[verified ✓]   " : "[NOT verified] ");

const users = await prisma.user.findMany({
  select: { username: true, name: true, verifiedAt: true },
});
const flaggedU = users.filter(
  (u) => nameRequiresVerification(u.username) || nameRequiresVerification(u.name)
);

const translators = await prisma.translator.findMany({
  select: { penName: true, user: { select: { username: true, verifiedAt: true } } },
});
const flaggedT = translators.filter((t) => nameRequiresVerification(t.penName));

console.log(`\n=== ชื่อผู้ใช้/ชื่อแสดง ที่มีคำสงวน (${flaggedU.length} จาก ${users.length} บัญชี) ===`);
if (!flaggedU.length) console.log("  — ไม่พบ —");
for (const u of flaggedU) {
  console.log(`  ${tag(u.verifiedAt)} username="${u.username}"${u.name ? `  name="${u.name}"` : ""}`);
}

console.log(`\n=== penName ครีเอเตอร์ ที่มีคำสงวน (${flaggedT.length} จาก ${translators.length} คน) ===`);
if (!flaggedT.length) console.log("  — ไม่พบ —");
for (const t of flaggedT) {
  console.log(`  ${tag(t.user.verifiedAt)} penName="${t.penName}"  (@${t.user.username})`);
}

console.log(`\nสรุป: ที่ต้องรีวิว = บรรทัดที่ขึ้น [NOT verified]`);
await prisma.$disconnect();
