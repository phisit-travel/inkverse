// Mobile QA: verify the chapter-upload PAUSE / RESUME button on a phone-sized
// viewport with touch. Logs in as a throwaway TRANSLATOR (QA_EMAIL/QA_PASS),
// creates a manga, attaches several pages, starts the upload, then:
//   1. taps "พักชั่วคราว" mid-upload  → loop must park (progress freezes)
//   2. taps "เล่นต่อ"                 → upload must resume and finish
// Also checks the two buttons render side-by-side and are tappable on mobile.
// Self-cleaning (deletes the test manga). Run against dev:3000.
const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");
const os = require("os");

const BASE = "http://localhost:3000";
const EMAIL = process.env.QA_EMAIL;
const PASS = process.env.QA_PASS;
const TITLE = "ทดสอบ pause มือถือ " + Date.now();
const N_PAGES = 8; // enough iterations that there's a window to catch the pause

const problems = [];
const steps = [];
function ok(s) { steps.push("  ✅ " + s); console.log("✅ " + s); }
function bad(s) { problems.push(s); steps.push("  ❌ " + s); console.log("❌ " + s); }

async function makePages(n) {
  const sharp = require("sharp");
  const out = [];
  for (let i = 0; i < n; i++) {
    const buf = await sharp({ create: { width: 1000, height: 1500, channels: 3, background: { r: 90 + i * 5, g: 100, b: 130 } } })
      .jpeg({ quality: 82 })
      .toBuffer();
    const p = path.join(os.tmpdir(), `qa-pause-${Date.now()}-${i}.jpg`);
    fs.writeFileSync(p, buf);
    out.push(p);
  }
  return out;
}

// pull the live upload-progress line off the page
async function progressText(page) {
  const t = await page.locator("body").innerText().catch(() => "");
  return (t.split("\n").find((l) => /พักไว้|กำลังอัปโหลดหน้า|กำลังเตรียมรูป|กำลังหยุด|กำลังสร้าง/.test(l)) || "").trim();
}

(async () => {
  if (!EMAIL || !PASS) { console.error("set QA_EMAIL and QA_PASS"); process.exit(2); }
  const browser = await chromium.launch();
  // real phone profile: 390x844, dpr 3, touch + isMobile
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  const pagePaths = await makePages(N_PAGES);

  const IGNORE = /Download the React DevTools|hydration|HMR|favicon|Warning: |\[Fast Refresh\]|cloudflarestorage\.com|r2\.|Fetch API cannot load https:\/\/inkverse-private/i;
  page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) problems.push("console.error: " + m.text().slice(0, 200)); });
  page.on("pageerror", (e) => problems.push("pageerror: " + String(e).slice(0, 200)));

  let slug = null;
  try {
    // ── 1. Login ─────────────────────────────────────────────────
    await page.goto(`${BASE}/auth/signin`, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    let authed = false;
    for (let i = 0; i < 40; i++) {
      if ((await ctx.cookies()).some((c) => c.name.includes("session-token") && c.value)) { authed = true; break; }
      await page.waitForTimeout(500);
    }
    if (!authed) { bad("login failed — no session cookie"); throw new Error("login failed"); }
    ok("login → session cookie set (mobile UA)");

    // ── 2. Create a manga ────────────────────────────────────────
    await page.goto(`${BASE}/upload`, { waitUntil: "domcontentloaded" });
    if (page.url().includes("/auth/")) { bad("/upload redirected to auth"); throw new Error("not translator"); }
    await page.fill('input[placeholder="ชื่อเรื่อง..."]', TITLE);
    await page.fill('textarea[placeholder="เรื่องย่อ..."]', "ทดสอบปุ่ม pause บนมือถือ");
    await page.click('button[type="submit"]:has-text("สร้างมังงะ")');
    await page.waitForSelector("text=สร้างมังงะสำเร็จ", { timeout: 15000 }).catch(() => {});
    const mine = await (await page.request.get(`${BASE}/api/manga?mine=1`)).json().catch(() => null);
    slug = mine?.data?.find((m) => m.title === TITLE)?.slug || null;
    slug ? ok(`manga created (slug "${slug}")`) : bad("could not create/resolve test manga");
    if (!slug) throw new Error("no manga");

    // ── 3. Go to chapter tab, select manga, attach pages ─────────
    await page.click('button:has-text("อัปโหลดตอนใหม่")');
    await page.waitForSelector(`select option[value="${slug}"]`, { timeout: 15000 }).catch(() => {});
    await page.selectOption("select", slug).catch(() => {});
    await page.fill('input[type="number"][placeholder="1"]', "1");
    await page.locator('input[type="file"][multiple]').first().setInputFiles(pagePaths);
    await page.waitForFunction((n) => document.querySelectorAll('img[alt^="หน้า"]').length >= n, N_PAGES, { timeout: 12000 }).catch(() => {});
    const previews = await page.locator('img[alt^="หน้า"]').count();
    previews >= N_PAGES ? ok(`${previews} page previews attached`) : bad(`only ${previews}/${N_PAGES} previews showed`);

    // ── 4. Start upload, then PAUSE mid-flight ───────────────────
    await page.getByRole("button", { name: "อัปโหลดตอน", exact: true }).click();
    // wait until the loop is actually running
    await page.waitForFunction(() => /กำลังเตรียมรูป|กำลังอัปโหลดหน้า/.test(document.body.innerText), { timeout: 15000 }).catch(() => {});
    const pauseBtn = page.getByRole("button", { name: "พักชั่วคราว" });
    const pauseVisible = await pauseBtn.isVisible().catch(() => false);
    pauseVisible ? ok("pause button visible during upload") : bad("pause button NOT visible during upload");

    // mobile layout: pause + stop sit side-by-side, both inside the 390px width
    const stopBtn = page.getByRole("button", { name: "หยุด / ยกเลิก" });
    const pb = await pauseBtn.boundingBox().catch(() => null);
    const sb = await stopBtn.boundingBox().catch(() => null);
    if (pb && sb) {
      const sameRow = Math.abs(pb.y - sb.y) < 8;
      const inViewport = pb.x >= 0 && sb.x + sb.width <= 390 + 1;
      const tappable = pb.height >= 36 && sb.height >= 36;
      sameRow && inViewport && tappable
        ? ok(`buttons side-by-side & tappable (h=${Math.round(pb.height)}px, fit 390px)`)
        : bad(`layout off: sameRow=${sameRow} inViewport=${inViewport} tappable=${tappable} (pb=${JSON.stringify(pb)} sb=${JSON.stringify(sb)})`);
    } else { bad("could not measure pause/stop buttons"); }

    await pauseBtn.tap(); // TOUCH tap, not click
    await page.waitForTimeout(400);
    const resumeVisible = await page.getByRole("button", { name: "เล่นต่อ" }).isVisible().catch(() => false);
    resumeVisible ? ok('tapped pause → button toggled to "เล่นต่อ"') : bad("pause tap did not toggle to resume");

    const p1 = await progressText(page);
    const paused1 = /พักไว้/.test(p1);
    paused1 ? ok(`progress shows paused state ("${p1.slice(0, 40)}")`) : bad(`progress not in paused state ("${p1}")`);

    // FREEZE check: nothing should advance, and it must NOT complete while paused
    await page.waitForTimeout(3000);
    const p2 = await progressText(page);
    const done = await page.locator("text=อัปโหลดสำเร็จ").count();
    const frozen = p1 === p2 && done === 0;
    frozen ? ok("loop parked while paused (progress frozen, not completed)") : bad(`loop did NOT stay paused (p1="${p1}" p2="${p2}" done=${done})`);

    // ── 5. RESUME → must finish ──────────────────────────────────
    await page.getByRole("button", { name: "เล่นต่อ" }).tap();
    await page.waitForSelector("text=อัปโหลดสำเร็จ", { timeout: 60000 }).catch(() => {});
    const upOk = await page.locator("text=อัปโหลดสำเร็จ").count();
    if (upOk) {
      ok("resume → upload completed (success card)");
    } else {
      bad("resume did NOT complete — onscreen: " + (await progressText(page)).slice(0, 120));
    }

    // ── 6. Verify pages actually stored ──────────────────────────
    await page.goto(`${BASE}/dashboard/manga/${encodeURIComponent(slug)}/chapters`, { waitUntil: "domcontentloaded" });
    const editHref = await page.locator('a[href*="reorder"]').first().getAttribute("href").catch(() => null);
    const chId = editHref ? editHref.match(/chapters\/([^/]+)\/reorder/)?.[1] : null;
    if (chId) {
      const pagesJson = await (await page.request.get(`${BASE}/api/chapters/${chId}/pages`)).json().catch(() => null);
      Array.isArray(pagesJson) && pagesJson.length === N_PAGES
        ? ok(`all ${pagesJson.length} pages stored after pause/resume`)
        : bad(`expected ${N_PAGES} pages, got ${Array.isArray(pagesJson) ? pagesJson.length : "?"}`);
    } else { bad("could not resolve chapter id to verify pages"); }

  } catch (e) {
    bad("EXCEPTION: " + String(e).slice(0, 300));
  } finally {
    if (slug) {
      const del = await page.request.delete(`${BASE}/api/manga/${encodeURIComponent(slug)}`).catch(() => null);
      del && del.ok() ? ok("cleanup: deleted test manga") : console.log("  (cleanup: delete returned " + (del ? del.status() : "err") + ")");
    }
    pagePaths.forEach((p) => { try { fs.unlinkSync(p); } catch {} });
    await browser.close();
  }

  console.log("\n===== MOBILE PAUSE/RESUME QA REPORT =====");
  steps.forEach((s) => console.log(s));
  console.log(`\n${problems.length === 0 ? "🟢 ALL CLEAN" : "🔴 " + problems.length + " PROBLEM(S)"}`);
  if (problems.length) { console.log("\n--- problems ---"); [...new Set(problems)].forEach((p) => console.log(" • " + p)); }
  process.exit(problems.length ? 1 : 0);
})();
