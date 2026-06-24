// One-off: notify creators who have an 18+ (ADULT) work about the new visibility
// rule — their 18+ work now shows on the WEB (badge + age gate) and is hidden in
// the Android app (Play Store). Sends an in-app notification (the bell).
//
// Idempotent: re-running skips anyone already notified (keyed by notification
// type). Only CREATES notifications — safe; nothing is deleted/modified.
//
// Run against PROD (set the prod URL yourself; this script does NOT read .env):
//   PowerShell:
//     $env:DATABASE_URL="<neon PROD pooled url>"; node scripts/notify-adult-creators.mjs; $env:DATABASE_URL=$null
//
// To preview WHO would be notified without sending, append --dry:
//     ... node scripts/notify-adult-creators.mjs --dry; ...

if (!process.env.DATABASE_URL) {
  console.error("✗ Set DATABASE_URL to the PROD connection string first.");
  process.exit(1);
}
const DRY = process.argv.includes("--dry");

const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const TYPE = "ADULT_VISIBILITY";
const TITLE = "เนื้อหา 18+ ของคุณแสดงบนเว็บแล้ว";
const BODY =
  "เรื่อง 18+ ของคุณแสดงในฟีด/ค้นหาบนเว็บแล้ว (ติดป้าย 18+ และผู้อ่านยืนยันอายุก่อนเปิดอ่าน) " +
  "ส่วนในแอป Android จะซ่อนไว้ตามนโยบาย Google Play — เป็นเรื่องปกติ ลงเรื่องต่อได้ตามปกติ";

// Distinct creators who own at least one ADULT work.
const works = await prisma.manga.findMany({
  where: { contentRating: "ADULT", translatorId: { not: null } },
  select: { translator: { select: { userId: true } } },
});
const userIds = [...new Set(works.map((w) => w.translator?.userId).filter(Boolean))];
console.log(`ADULT creators found: ${userIds.length}${DRY ? "  (dry run — nothing sent)" : ""}`);

let sent = 0;
for (const userId of userIds) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  const already = await prisma.notification.findFirst({ where: { userId, type: TYPE }, select: { id: true } });
  if (already) {
    console.log(`  skip (already notified): ${u?.username ?? userId}`);
    continue;
  }
  if (DRY) {
    console.log(`  would notify: ${u?.username ?? userId}`);
    continue;
  }
  await prisma.notification.create({
    data: { userId, type: TYPE, title: TITLE, body: BODY, link: "/dashboard" },
  });
  console.log(`  notified: ${u?.username ?? userId}`);
  sent++;
}
console.log(`\n${DRY ? "(dry run) " : ""}sent ${sent} notification(s)`);
await prisma.$disconnect();
