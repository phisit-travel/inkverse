// Deep QA: drive the TRANSLATOR (uploader) journey through the real UI.
// Env: QA_EMAIL, QA_PASS. Creates a manga + uploads a real page image, then
// verifies the public reader shows it. Self-cleaning. Reports HTTP >= 400.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const os = require("os");

const BASE = "http://localhost:3000";
const EMAIL = process.env.QA_EMAIL;
const PASS = process.env.QA_PASS;
const TITLE = "ทดสอบ QA มังงะไทย " + Date.now(); // Thai title → slug decode test

const problems = [];
const steps = [];
function ok(s) { steps.push("  ✅ " + s); console.log("✅ " + s); }
function bad(s) { problems.push(s); steps.push("  ❌ " + s); console.log("❌ " + s); }

// A realistic manga page (800x1200 JPEG) so the server-side sharp fallback
// accepts it — a real translator never uploads a degenerate 8px image.
async function makePage() {
  const sharp = require("sharp");
  const buf = await sharp({ create: { width: 800, height: 1200, channels: 3, background: { r: 110, g: 115, b: 130 } } })
    .jpeg({ quality: 80 })
    .toBuffer();
  const p = path.join(os.tmpdir(), `qa-page-${Date.now()}.jpg`);
  fs.writeFileSync(p, buf);
  return p;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const page = await ctx.newPage();
  const pngPath = await makePage();

  // R2 direct-PUT CORS errors are expected from localhost (the code falls back
  // to the through-server upload path); they don't occur from the real domain.
  const IGNORE = /Download the React DevTools|hydration|HMR|favicon|Warning: |\[Fast Refresh\]|cloudflarestorage\.com|r2\.|Fetch API cannot load https:\/\/inkverse-private/i;
  page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) problems.push("console.error: " + m.text().slice(0, 200)); });
  page.on("pageerror", (e) => problems.push("pageerror: " + String(e).slice(0, 200)));
  const netlog = [];
  page.on("request", (r) => { const u = r.url(); if (/upload|presign|\/chapters|amazonaws|r2\.|cloudflarestorage/.test(u)) netlog.push(`→ ${r.method()} ${u.slice(0, 90)}`); });
  page.on("requestfinished", (r) => { const u = r.url(); if (/upload|presign|amazonaws|r2\.|cloudflarestorage/.test(u)) netlog.push(`✓ done ${u.slice(0, 70)}`); });
  page.on("requestfailed", (r) => { const u = r.url(); if (/upload|presign|amazonaws|r2\.|cloudflarestorage/.test(u)) netlog.push(`✗ FAILED ${r.failure()?.errorText} ${u.slice(0, 70)}`); });
  page.on("response", (r) => {
    const u = r.url();
    if (/upload|presign|\/chapters/.test(u)) netlog.push(`  ${r.status()} ${u.slice(0, 80)}`);
    if (!u.startsWith(BASE)) return; // ignore R2 direct-PUT CORS failures (expected)
    if (r.status() >= 400 && !/_next\/|favicon|\.map$/.test(u))
      problems.push(`HTTP ${r.status()} ${r.request().method()} ${u.replace(BASE, "")}`);
  });

  let slug = null;
  try {
    // ── 1. Login ────────────────────────────────────────────────
    await page.goto(`${BASE}/auth/signin`, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    let authed = false;
    for (let i = 0; i < 40; i++) {
      if ((await ctx.cookies()).some((c) => c.name.includes("session-token") && c.value)) { authed = true; break; }
      await page.waitForTimeout(500);
    }
    if (!authed) { bad("login failed — no session cookie"); throw new Error("login failed, aborting"); }
    ok("login (credentials) → session cookie set");

    // ── 2. /upload loads (translator, not redirected to auth) ───
    await page.goto(`${BASE}/upload`, { waitUntil: "domcontentloaded" });
    !page.url().includes("/auth/") ? ok("/upload loads (translator)") : bad("/upload redirected to auth: " + page.url());

    // ── 3. Create a manga (Thai title) ──────────────────────────
    await page.fill('input[placeholder="ชื่อเรื่อง..."]', TITLE);
    await page.fill('textarea[placeholder="เรื่องย่อ..."]', "เรื่องย่อสำหรับทดสอบ QA มังงะ ระบบอัปโหลด");
    // pick first genre chip if any
    const g = page.locator('form button[type="button"]').filter({ hasNotText: "" }).first();
    await page.click('button[type="submit"]:has-text("สร้างมังงะ")');
    await page.waitForSelector('text=สร้างมังงะสำเร็จ', { timeout: 15000 }).catch(() => {});
    const created = await page.locator('text=สร้างมังงะสำเร็จ').count();
    created ? ok("manga created (success card shown)") : bad("manga create did not show success");

    // resolve slug via the mine=1 API
    const mine = await (await page.request.get(`${BASE}/api/manga?mine=1`)).json().catch(() => null);
    slug = mine?.data?.find((m) => m.title === TITLE)?.slug || null;
    slug ? ok(`manga slug resolved ("${slug}")`) : bad("could not resolve created manga slug");

    if (slug) {
      // ── 4. Upload a chapter with one page image ───────────────
      await page.click('button:has-text("อัปโหลดตอนใหม่")');
      // wait for the mine=1 dropdown to actually contain our manga option
      await page.waitForSelector(`select option[value="${slug}"]`, { timeout: 15000 }).catch(() => {});
      await page.selectOption("select", slug).catch(() => {});
      const selVal = await page.locator("select").first().inputValue().catch(() => "");
      selVal === slug ? ok("manga selected in upload dropdown") : bad(`dropdown select failed (value="${selVal}")`);
      await page.fill('input[type="number"][placeholder="1"]', "1");
      // diagnostic: enumerate file inputs in the chapter tab
      const inputs = await page.evaluate(() => Array.from(document.querySelectorAll('input[type=file]')).map((el) => ({ accept: el.getAttribute("accept"), multiple: el.multiple, hidden: el.offsetParent === null })));
      console.log("  file inputs:", JSON.stringify(inputs));
      // attach the page image to the pages file input (multiple = the pages dropzone)
      const pagesInput = page.locator('input[type="file"][multiple]').first();
      await pagesInput.setInputFiles(pngPath);
      await page.waitForFunction(() => document.querySelectorAll('img[alt^="หน้า"]').length > 0, { timeout: 8000 }).catch(() => {});
      const previewCount = await page.locator('img[alt^="หน้า"]').count();
      console.log("  page previews after attach:", previewCount);
      await page.getByRole("button", { name: "อัปโหลดตอน", exact: true }).click();
      await page.waitForSelector('text=อัปโหลดสำเร็จ', { timeout: 40000 }).catch(() => {});
      const upOk = await page.locator('text=อัปโหลดสำเร็จ').count();
      if (upOk) {
        ok("chapter + page uploaded (success card)");
      } else {
        // surface the on-screen state + network trace so we know the real cause
        const prog = await page.locator("body").innerText().catch(() => "");
        const line = prog.split("\n").find((t) => /ล้มเหลว|ไม่สำเร็จ|ใหญ่เกิน|ผิดพลาด|กรุณา|กำลัง/.test(t));
        bad("chapter upload did not succeed — onscreen: " + (line ? line.slice(0, 140) : "(none)"));
        console.log("  --- upload net trace ---");
        netlog.forEach((l) => console.log("   " + l));
      }

      // ── 5. Pages actually stored ──────────────────────────────
      const chapters = await page.request.get(`${BASE}/dashboard/manga/${encodeURIComponent(slug)}/chapters`);
      void chapters;
      // resolve chapter id from the manage page DOM
      await page.goto(`${BASE}/dashboard/manga/${encodeURIComponent(slug)}/chapters`, { waitUntil: "domcontentloaded" });
      const editHref = await page.locator('a[href*="reorder"], a[href*="write?ch="]').first().getAttribute("href").catch(() => null);
      const chId = editHref ? editHref.match(/chapters\/([^/]+)\/reorder/)?.[1] || editHref.match(/ch=([^&]+)/)?.[1] : null;
      if (chId) {
        const pagesJson = await (await page.request.get(`${BASE}/api/chapters/${chId}/pages`)).json().catch(() => null);
        Array.isArray(pagesJson) && pagesJson.length > 0
          ? ok(`pages stored (${pagesJson.length} page record(s))`)
          : bad("no page records found for the chapter");
      } else {
        bad("could not resolve chapter id from manage page");
      }

      // ── 6. Dashboard tool pages (no 500) ──────────────────────
      for (const [label, p] of [
        ["analytics", `/dashboard/manga/${encodeURIComponent(slug)}/analytics`],
        ["chapters", `/dashboard/manga/${encodeURIComponent(slug)}/chapters`],
        ["promote", `/dashboard/promote`],
      ]) {
        const resp = await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" });
        const st = resp ? resp.status() : 0;
        st < 400 && !page.url().includes("/auth/") ? ok(`${label} page loads (${st})`) : bad(`${label} failed (status ${st})`);
      }

      // ── 7. PUBLIC content page (Thai slug) ────────────────────
      const pub = await page.goto(`${BASE}/content/${encodeURIComponent(slug)}`, { waitUntil: "domcontentloaded" });
      const h1 = await page.locator("h1").first().innerText().catch(() => "");
      pub && pub.status() < 400 && h1.includes("ทดสอบ")
        ? ok(`public /content/[thai-slug] renders (h1="${h1.slice(0, 22)}")`)
        : bad(`public content page broken (status ${pub ? pub.status() : "?"}, h1="${h1}")`);

      // ── 8. PUBLIC reader renders the page ─────────────────────
      // The manga reader paints pages onto <canvas> (anti-scrape), not <img>,
      // and lazy-loads via IntersectionObserver — so watch for the signed
      // /api/img fetch + a canvas element after scrolling into view.
      let imgFetched = false;
      page.on("response", (r) => { if (r.url().includes("/api/img/")) imgFetched = true; });
      const rd = await page.goto(`${BASE}/content/${encodeURIComponent(slug)}/1`, { waitUntil: "domcontentloaded" });
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(2500);
      const canvases = await page.locator("canvas").count();
      rd && rd.status() < 400 && (canvases > 0 || imgFetched)
        ? ok(`public reader renders page (canvas=${canvases}, /api/img fetched=${imgFetched})`)
        : bad(`public reader did not render page (status ${rd ? rd.status() : "?"}, canvas=${canvases}, imgFetched=${imgFetched})`);

      // ── 9. Cleanup: delete the manga we created ───────────────
      const del = await page.request.delete(`${BASE}/api/manga/${encodeURIComponent(slug)}`);
      del.ok() ? ok("cleanup: deleted test manga") : console.log("  (cleanup note: delete returned " + del.status() + ")");
    }
  } catch (e) {
    bad("EXCEPTION: " + String(e).slice(0, 300));
  } finally {
    try { fs.unlinkSync(pngPath); } catch {}
    await browser.close();
  }

  console.log("\n===== QA TRANSLATOR JOURNEY REPORT =====");
  steps.forEach((s) => console.log(s));
  console.log(`\n${problems.length === 0 ? "🟢 ALL CLEAN" : "🔴 " + problems.length + " PROBLEM(S)"}`);
  if (problems.length) { console.log("\n--- problems ---"); [...new Set(problems)].forEach((p) => console.log(" • " + p)); }
  process.exit(problems.length ? 1 : 0);
})();
