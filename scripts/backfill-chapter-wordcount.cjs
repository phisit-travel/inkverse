// Backfill Chapter.wordCount for existing novel chapters. Idempotent.
// Run AFTER `npx prisma db push`:  node scripts/backfill-chapter-wordcount.cjs
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// inline copy of novelStats word count (Thai-aware) — same as lib/markdown
function words(html) {
  if (!html) return 0;
  const text = html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").trim();
  const thai = (text.match(/[฀-๿]/g) || []).length;
  const latin = (text.replace(/[฀-๿]/g, " ").match(/\S+/g) || []).length;
  return latin + Math.ceil(thai / 3);
}
(async () => {
  const chs = await prisma.chapter.findMany({ where: { content: { not: null } }, select: { id: true, content: true } });
  let n = 0;
  for (const c of chs) {
    await prisma.chapter.update({ where: { id: c.id }, data: { wordCount: words(c.content) } });
    n++;
  }
  console.log(`✅ backfilled wordCount for ${n} chapters`);
  await prisma.$disconnect();
})();
