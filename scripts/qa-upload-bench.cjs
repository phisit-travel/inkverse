// Bench: time a 20-page chapter upload through the real UI (login → create manga
// → attach 20 pages → click upload → wait for success). Prints wall-clock seconds
// for the upload phase. Run before/after a concurrency change to compare.
const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");
const os = require("os");

const BASE = "http://localhost:3000";
const EMAIL = process.env.QA_EMAIL;
const PASS = process.env.QA_PASS;
const N = parseInt(process.env.BENCH_PAGES || "20", 10);
const TITLE = "bench upload " + Date.now();

async function makePages(n) {
  const sharp = require("sharp");
  const out = [];
  for (let i = 0; i < n; i++) {
    const buf = await sharp({ create: { width: 1200, height: 1800, channels: 3, background: { r: 80 + i, g: 100, b: 140 } } }).jpeg({ quality: 84 }).toBuffer();
    const p = path.join(os.tmpdir(), `bench-${Date.now()}-${i}.jpg`);
    fs.writeFileSync(p, buf); out.push(p);
  }
  return out;
}

(async () => {
  if (!EMAIL || !PASS) { console.error("set QA_EMAIL/QA_PASS"); process.exit(2); }
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  // suppress mobile-only overlays that would intercept taps (app-install banner,
  // welcome popup, cookie bar) — they're not what we're benchmarking
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("ink-app-banner", "off");
      localStorage.setItem("ivRecruitSeen", "1");
      localStorage.setItem("ivCookieConsent", "all");
    } catch {}
  });
  const page = await ctx.newPage();
  const paths = await makePages(N);
  let slug = null;
  try {
    await page.goto(`${BASE}/auth/signin`, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    for (let i = 0; i < 40; i++) { if ((await ctx.cookies()).some((c) => c.name.includes("session-token") && c.value)) break; await page.waitForTimeout(500); }

    await page.goto(`${BASE}/upload`, { waitUntil: "domcontentloaded" });
    await page.fill('input[placeholder="ชื่อเรื่อง..."]', TITLE);
    await page.fill('textarea[placeholder="เรื่องย่อ..."]', "เบนช์มาร์คความเร็วการอัปโหลดตอน");
    await page.click('button[type="submit"]:has-text("สร้างมังงะ")');
    await page.waitForSelector("text=สร้างมังงะสำเร็จ", { timeout: 20000 }).catch(() => {});
    for (let i = 0; i < 10 && !slug; i++) {
      const mine = await (await page.request.get(`${BASE}/api/manga?mine=1`)).json().catch(() => null);
      slug = mine?.data?.find((m) => m.title === TITLE)?.slug || null;
      if (!slug) await page.waitForTimeout(800);
    }
    if (!slug) {
      const onscreen = (await page.locator("body").innerText().catch(() => "")).split("\n").find((l) => /ผิดพลาด|ไม่สำเร็จ|กรุณา|แล้ว/.test(l));
      throw new Error("no manga — onscreen: " + (onscreen || "(none)"));
    }

    await page.click('button:has-text("อัปโหลดตอนใหม่")');
    await page.waitForSelector(`select option[value="${slug}"]`, { timeout: 15000 }).catch(() => {});
    await page.selectOption("select", slug).catch(() => {});
    await page.fill('input[type="number"][placeholder="1"]', "1");
    await page.locator('input[type="file"][multiple]').first().setInputFiles(paths);
    await page.waitForFunction((n) => document.querySelectorAll('img[alt^="หน้า"]').length >= n, N, { timeout: 20000 }).catch(() => {});

    const t0 = Date.now();
    await page.getByRole("button", { name: "อัปโหลดตอน", exact: true }).click();
    await page.waitForSelector("text=อัปโหลดสำเร็จ", { timeout: 120000 });
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`BENCH ${N} pages => ${secs}s`);
  } catch (e) {
    console.log("BENCH FAIL: " + String(e).slice(0, 200));
  } finally {
    if (slug) await page.request.delete(`${BASE}/api/manga/${encodeURIComponent(slug)}`).catch(() => {});
    paths.forEach((p) => { try { fs.unlinkSync(p); } catch {} });
    await browser.close();
  }
})();
