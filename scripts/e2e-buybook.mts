// Money-invariant e2e for the "buy the whole book" feature. Exercises the real
// API (POST /api/coin/buy-book) via authed Playwright requests, asserting every
// money rule: exact charge, full unlock, creator 80% earning, audit txn,
// idempotent re-buy (no charge), insufficient coins, partial ownership, VIP price.
// Run: npm run dev (:3000) then `node scripts/e2e-buybook.mts`.
import { readFileSync } from "node:fs";
import { chromium, type BrowserContext } from "playwright";

const BASE = "http://localhost:3000";
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const bcrypt = (await import("bcryptjs")).default;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"}  ${n} ${c ? "" : x}`); };

const EMAILS = ["bb-creator", "bb-r1", "bb-r2", "bb-r3", "bb-vip"].map((s) => `${s}@test.local`);
await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
const pw = await bcrypt.hash("password123", 10);
const sfx = Date.now().toString(36).slice(-4);

const creator = await prisma.user.create({
  data: { email: "bb-creator@test.local", username: "bbcreator" + sfx, passwordHash: pw, emailVerified: new Date(), role: "TRANSLATOR", translator: { create: { penName: "bbcreator", bio: "", kind: "WRITER" } } },
  select: { translator: { select: { id: true } } },
});
const tId = creator.translator!.id;
const SLUG = "bb-book-" + sfx;
const manga = await prisma.manga.create({
  data: { title: "หนังสือทดสอบ", slug: SLUG, description: "x", type: "NOVEL", originCountry: "TH", status: "ONGOING", contentRating: "TEEN", published: true, bookPrice: 100, translatorId: tId },
});
// 3 premium chapters, 50 coins each → 150 if bought separately, book = 100.
const chaps = [];
for (let n = 1; n <= 3; n++) {
  chaps.push(await prisma.chapter.create({ data: { mangaId: manga.id, chapterNum: n, title: `ตอน ${n}`, isPremium: true, coinCost: 50, status: "PUBLISHED", publishedAt: new Date() }, select: { id: true } }));
}
async function reader(email: string, coins: number, vip = false) {
  return prisma.user.create({ data: { email, username: email.split("@")[0] + sfx, passwordHash: pw, emailVerified: new Date(), role: "READER", coins, ...(vip ? { vipExpiresAt: new Date(Date.now() + 30 * 864e5) } : {}) }, select: { id: true } });
}
const r1 = await reader("bb-r1@test.local", 200);
const r2 = await reader("bb-r2@test.local", 10);
const r3 = await reader("bb-r3@test.local", 200);
const vip = await reader("bb-vip@test.local", 200, true);
// r3 already owns chapter 1 (prior single unlock).
await prisma.unlockedChapter.create({ data: { userId: r3.id, chapterId: chaps[0].id, coinSpent: 50 } });

const browser = await chromium.launch();
let ipSeq = 1;
async function buy(email: string): Promise<{ status: number; body: any }> {
  const ctx: BrowserContext = await browser.newContext({ extraHTTPHeaders: { "x-real-ip": `10.90.90.${ipSeq++}` } });
  await ctx.addInitScript(() => { try { localStorage.setItem("ivRecruitSeen", "1"); } catch {} });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/signin`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "password123");
  await page.click('form button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/auth/signin"), { timeout: 20000 });
  const res = await page.request.post(`${BASE}/api/coin/buy-book`, { data: { mangaId: manga.id } });
  const body = await res.json().catch(() => ({}));
  await ctx.close();
  return { status: res.status(), body };
}
const coinsOf = async (id: string) => (await prisma.user.findUnique({ where: { id }, select: { coins: true } }))!.coins;
const unlocksOf = (id: string) => prisma.unlockedChapter.count({ where: { userId: id, chapterId: { in: chaps.map((c) => c.id) } } });
const earningsOf = (uid: string) => prisma.translatorEarning.findMany({ where: { translatorId: tId, userId: uid, mangaId: manga.id } });

// ── 1. Happy path ───────────────────────────────────────────────────────────
const a = await buy("bb-r1@test.local");
ok("buy ok (200)", a.status === 200 && a.body.success === true, `(status=${a.status} ${JSON.stringify(a.body)})`);
ok("charged exactly bookPrice (100)", a.body.coinsSpent === 100 && (await coinsOf(r1.id)) === 100, `(spent=${a.body.coinsSpent} coins=${await coinsOf(r1.id)})`);
ok("all 3 chapters unlocked", (await unlocksOf(r1.id)) === 3 && a.body.unlockedCount === 3);
const e1 = await earningsOf(r1.id);
ok("creator earning = 80% of price (80)", e1.length === 1 && e1[0].amount === 80 && e1[0].coinsSpent === 100, `(${JSON.stringify(e1)})`);
const txn = await prisma.coinTransaction.findFirst({ where: { userId: r1.id, refId: `book:${manga.id}` } });
ok("SPEND txn recorded (-100, audit refId)", !!txn && txn.amount === -100 && txn.type === "SPEND");

// ── 2. Idempotent re-buy → no charge ─────────────────────────────────────────
const b = await buy("bb-r1@test.local");
ok("re-buy returns alreadyOwned + 0 charge", b.status === 200 && b.body.alreadyOwned === true && b.body.coinsSpent === 0);
ok("re-buy did NOT deduct coins", (await coinsOf(r1.id)) === 100);
ok("re-buy did NOT create a 2nd earning", (await earningsOf(r1.id)).length === 1);

// ── 3. Insufficient coins ────────────────────────────────────────────────────
const c = await buy("bb-r2@test.local");
ok("insufficient coins → 402", c.status === 402, `(status=${c.status})`);
ok("insufficient → no coins deducted", (await coinsOf(r2.id)) === 10);
ok("insufficient → nothing unlocked", (await unlocksOf(r2.id)) === 0);

// ── 4. Partial ownership (owns 1/3) → unlock remaining 2, charge bundle ───────
const d = await buy("bb-r3@test.local");
ok("partial owner buy ok", d.status === 200 && d.body.success === true);
ok("partial: charged bookPrice (100), unlocked remaining 2", d.body.coinsSpent === 100 && d.body.unlockedCount === 2 && (await coinsOf(r3.id)) === 100);
ok("partial: now owns all 3", (await unlocksOf(r3.id)) === 3);

// ── 5. VIP discount (10% off) ────────────────────────────────────────────────
const v = await buy("bb-vip@test.local");
ok("VIP charged 90 (10% off 100)", v.body.coinsSpent === 90 && (await coinsOf(vip.id)) === 110, `(spent=${v.body.coinsSpent})`);
const ev = await earningsOf(vip.id);
ok("VIP earning = 80% of 90 (72)", ev.length === 1 && ev[0].amount === 72, `(${JSON.stringify(ev)})`);

await browser.close();
await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
await prisma.$disconnect();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
