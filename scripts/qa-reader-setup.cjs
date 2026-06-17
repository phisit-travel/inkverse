// QA setup for the READER journey: a creator + manga with a free chapter (one
// page) and a premium chapter, plus a reader account with coins to unlock.
// Prints JSON for the e2e. Cleanup: qa-cleanup-all.cjs (qa-*@inkverse.test).
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

(async () => {
  const ts = Date.now();
  // creator + manga
  const creator = await prisma.user.create({
    data: {
      username: `qa_tlr_${ts}`, email: `qa-tlr-${ts}@inkverse.test`,
      passwordHash: await bcrypt.hash("x", 10), role: "TRANSLATOR", emailVerified: new Date(),
      translator: { create: { penName: `QA Creator ${ts}`, kind: "TRANSLATOR" } },
    },
    include: { translator: true },
  });
  const manga = await prisma.manga.create({
    data: {
      title: `ทดสอบ QA นักอ่าน ${ts}`, slug: `ทดสอบ-qa-นักอ่าน-${ts}`,
      description: "เรื่องสำหรับทดสอบ flow นักอ่าน bookmark/unlock/comment",
      type: "MANGA", status: "ONGOING", contentRating: "EVERYONE", originCountry: "JP",
      translatorId: creator.translator.id,
    },
  });
  const freeCh = await prisma.chapter.create({
    data: { mangaId: manga.id, chapterNum: 1, title: "ตอนฟรี", status: "PUBLISHED", isPremium: false,
      pages: { create: { pageNum: 1, imageUrl: `pages/qa/${ts}.webp`, width: 800, height: 1200 } } },
  });
  const premiumCh = await prisma.chapter.create({
    data: { mangaId: manga.id, chapterNum: 2, title: "ตอนพรีเมียม", status: "PUBLISHED", isPremium: true, coinCost: 5,
      pages: { create: { pageNum: 1, imageUrl: `pages/qa/${ts}-2.webp`, width: 800, height: 1200 } } },
  });

  // reader with coins
  const password = `Qa!${ts}`;
  const reader = await prisma.user.create({
    data: {
      username: `qa_reader_${ts}`, email: `qa-reader-${ts}@inkverse.test`,
      passwordHash: await bcrypt.hash(password, 10), role: "READER", emailVerified: new Date(),
      coins: 100,
    },
  });

  console.log(JSON.stringify({
    readerEmail: reader.email, readerPassword: password, readerId: reader.id, readerCoins: 100,
    creatorId: creator.id, mangaId: manga.id, mangaSlug: manga.slug,
    freeChapterId: freeCh.id, premiumChapterId: premiumCh.id, premiumCost: 5,
  }));
  await prisma.$disconnect();
})().catch((e) => { console.error("SETUP_FAIL", e.message); process.exit(1); });
