// QA: verify the 3 new translator tools — Glossary (Story Bible GLOSSARY cat),
// long-strip auto-splitter (upload), and the chapter Preview link.
// Env: QA_EMAIL, QA_PASS (a TRANSLATOR). Self-cleaning (deletes its manga).
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path"), os = require("os");

const BASE = "http://localhost:3000";
const EMAIL = process.env.QA_EMAIL, PASS = process.env.QA_PASS;
const TS = Date.now();
const TITLE = "ทดสอบ QA Toolkit " + TS;
const SLUG = "qa-toolkit-" + TS;

const problems = [];
const steps = [];
function ok(s) { steps.push("  ✅ " + s); console.log("✅ " + s); }
function bad(s) { problems.push(s); steps.push("  ❌ " + s); console.log("❌ " + s); }

async function tallStrip() {
  const sharp = require("sharp");
  // 800 x 6000 vertical strip → ratio 7.5 → should split into 4 pages (1800×3 + 600)
  const buf = await sharp({ create: { width: 800, height: 6000, channels: 3, background: { r: 90, g: 100, b: 120 } } }).jpeg({ quality: 70 }).toBuffer();
  const p = path.join(os.tmpdir(), `qa-strip-${TS}.jpg`);
  fs.writeFileSync(p, buf);
  return p;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const page = await ctx.newPage();
  const strip = await tallStrip();
  const IGNORE = /DevTools|hydration|HMR|favicon|Warning: |\[Fast Refresh\]|cloudflarestorage|inkverse-private|\/api\/img\//i;
  page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) problems.push("console.error: " + m.text().slice(0, 140)); });
  page.on("response", (r) => { const u = r.url(); if (u.startsWith(BASE) && r.status() >= 500 && !/\/api\/img\//.test(u)) problems.push(`HTTP ${r.status()} ${u.replace(BASE, "")}`); });
  const enc = encodeURIComponent;

  try {
    // login
    await page.goto(`${BASE}/auth/signin`, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    let authed = false;
    for (let i = 0; i < 40; i++) { if ((await ctx.cookies()).some((c) => c.name.includes("session-token") && c.value)) { authed = true; break; } await page.waitForTimeout(500); }
    if (!authed) { bad("login failed"); throw new Error("login"); }
    ok("login (translator)");

    // create a manga via API
    const mk = await page.request.post(`${BASE}/api/manga`, { data: { title: TITLE, slug: SLUG, description: "ทดสอบ toolkit นักแปล glossary/splitter/preview", type: "MANGA" } });
    const mkj = await mk.json().catch(() => ({}));
    const slug = mkj.slug || SLUG;
    mk.ok() ? ok(`manga created ("${slug}")`) : bad(`manga create failed (${mk.status()})`);

    // ── 1. GLOSSARY (Story Bible new category) ──────────────────
    const g = await page.request.post(`${BASE}/api/manga/${enc(slug)}/bible`, { data: { category: "GLOSSARY", title: "Arin", body: "อาริน (ใช้ชื่อนี้ทุกตอน)" } });
    g.ok() ? ok(`glossary entry created via API (${g.status()})`) : bad(`glossary POST failed (${g.status()})`);
    const list = await (await page.request.get(`${BASE}/api/manga/${enc(slug)}/bible`)).json().catch(() => []);
    const has = Array.isArray(list) && list.some((e) => e.category === "GLOSSARY" && e.title === "Arin");
    has ? ok("glossary entry persisted (category=GLOSSARY)") : bad(`glossary entry not found (${JSON.stringify(list).slice(0, 120)})`);
    // bible UI shows the คำแปล/ชื่อ tab
    await page.goto(`${BASE}/dashboard/manga/${enc(slug)}/bible`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const bibleTxt = await page.locator("body").innerText();
    bibleTxt.includes("คำแปล/ชื่อ") ? ok("bible UI shows the คำแปล/ชื่อ (glossary) tab") : bad("bible UI missing glossary tab");

    // ── 2. SPLITTER — upload a tall strip, expect >1 pages ──────
    await page.goto(`${BASE}/upload`, { waitUntil: "domcontentloaded" });
    await page.click('button:has-text("อัปโหลดตอนใหม่")');
    await page.waitForSelector(`select option[value="${slug}"]`, { timeout: 15000 }).catch(() => {});
    await page.selectOption("select", slug).catch(() => {});
    await page.fill('input[type="number"][placeholder="1"]', "1");
    // ensure splitter toggle is ON (default true)
    const splitOn = await page.evaluate(() => {
      const lbl = [...document.querySelectorAll("button")].find((b) => /ตัดภาพแนวตั้งยาว/.test(b.textContent || ""));
      return !!lbl;
    });
    splitOn ? ok("split-long toggle present in uploader") : bad("split-long toggle missing");
    await page.locator('input[type="file"][multiple]').first().setInputFiles(strip);
    await page.waitForFunction(() => document.querySelectorAll('img[alt^="หน้า"]').length > 0, { timeout: 8000 }).catch(() => {});
    await page.getByRole("button", { name: "อัปโหลดตอน", exact: true }).click();
    await page.waitForSelector("text=อัปโหลดสำเร็จ", { timeout: 60000 }).catch(() => {});
    // resolve chapter id + count pages
    await page.goto(`${BASE}/dashboard/manga/${enc(slug)}/chapters`, { waitUntil: "domcontentloaded" });
    const href = await page.locator('a[href*="reorder"]').first().getAttribute("href").catch(() => null);
    const chId = href ? href.match(/chapters\/([^/]+)\/reorder/)?.[1] : null;
    if (chId) {
      const pages = await (await page.request.get(`${BASE}/api/chapters/${chId}/pages`)).json().catch(() => []);
      const n = Array.isArray(pages) ? pages.length : 0;
      n > 1 ? ok(`long strip auto-split into ${n} pages (✂️ works)`) : bad(`strip not split — only ${n} page(s)`);
    } else {
      bad("could not resolve uploaded chapter id");
    }

    // ── 3. PREVIEW link in chapter manager ──────────────────────
    const previewLink = await page.locator('a[href="/content/' + slug + '/1"]').first();
    const pvCount = await page.locator(`a[href*="/content/${slug}/"]`).filter({ hasText: "พรีวิว" }).count();
    pvCount > 0 ? ok("preview link shown in chapter manager") : bad("preview link missing in chapter manager");
    void previewLink;
    // load the preview URL (owner can view it even if draft)
    const pv = await page.goto(`${BASE}/content/${enc(slug)}/1`, { waitUntil: "domcontentloaded" });
    pv && pv.status() < 400 ? ok(`preview page opens for owner (${pv.status()})`) : bad(`preview page failed (${pv ? pv.status() : "?"})`);

    // cleanup
    const del = await page.request.delete(`${BASE}/api/manga/${enc(slug)}`);
    del.ok() ? ok("cleanup: manga deleted") : console.log("  (cleanup: delete " + del.status() + ")");
  } catch (e) {
    bad("EXCEPTION: " + String(e).slice(0, 200));
  } finally {
    try { fs.unlinkSync(strip); } catch {}
    await browser.close();
  }

  console.log("\n===== QA TRANSLATOR TOOLKIT REPORT =====");
  steps.forEach((s) => console.log(s));
  console.log(`\n${problems.length === 0 ? "🟢 ALL CLEAN" : "🔴 " + problems.length + " PROBLEM(S)"}`);
  if (problems.length) { console.log("\n--- problems ---"); [...new Set(problems)].forEach((p) => console.log(" • " + p)); }
  process.exit(problems.length ? 1 : 0);
})();
