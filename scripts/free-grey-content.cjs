// One-time: make ALL chapters of the "INKVERSE Official" account free (remove the
// coin paywall on the imported/grey content — stop monetizing third-party works).
// Targets ONLY that translator id, so other creators' original works are untouched.
//   node scripts/free-grey-content.cjs
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const TRANSLATOR_ID = "8471e133-7c33-4ccb-8ea5-8939a82f6863"; // INKVERSE Official (admin@inkverse.io)

(async () => {
  const t = await prisma.translator.findUnique({ where: { id: TRANSLATOR_ID }, select: { penName: true } });
  if (!t) { console.log("❌ ไม่เจอ translator นี้ — ยกเลิก"); process.exit(1); }
  const mids = (await prisma.manga.findMany({ where: { translatorId: TRANSLATOR_ID }, select: { id: true } })).map((m) => m.id);
  const before = await prisma.chapter.count({ where: { mangaId: { in: mids }, isPremium: true } });
  const r = await prisma.chapter.updateMany({
    where: { mangaId: { in: mids }, isPremium: true },
    data: { isPremium: false, coinCost: 0, freeAt: null },
  });
  console.log(`✅ "${t.penName}": ปลด ${r.count} ตอน (จาก ${before} premium) เป็นฟรีแล้ว — เหลือ premium 0`);
  await prisma.$disconnect();
})();
