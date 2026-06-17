// Reproduce the translator "หลายตอนในครั้งเดียว" (bulk folder) upload to see
// whether it's broken at the logic level (desktop) or only device-specific.
// Env: QA_EMAIL, QA_PASS (a TRANSLATOR). Self-cleaning.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path"), os = require("os");

const BASE = "http://localhost:3000";
const EMAIL = process.env.QA_EMAIL, PASS = process.env.QA_PASS;
const TS = Date.now();
const SLUG = "qa-bulk-" + TS;
const TITLE = "ทดสอบ QA Bulk " + TS;

const log = (...a) => console.log(...a);

async function makeTree() {
  const sharp = require("sharp");
  const root = path.join(os.tmpdir(), `qa-bulk-${TS}`);
  for (const [ch, pages] of [["ตอนที่ 1", 2], ["ตอนที่ 2", 3], ["ตอนที่ 3", 1]]) {
    const dir = path.join(root, ch);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 1; i <= pages; i++) {
      const buf = await sharp({ create: { width: 800, height: 1200, channels: 3, background: { r: 100, g: 110, b: 120 } } }).jpeg({ quality: 60 }).toBuffer();
      fs.writeFileSync(path.join(dir, `${i}.jpg`), buf);
    }
  }
  return root;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" && !/cloudflarestorage|inkverse-private|\/api\/img\//.test(m.text())) log("  console.error:", m.text().slice(0, 140)); });
  const root = await makeTree();
  const enc = encodeURIComponent;

  try {
    // login
    await page.goto(`${BASE}/auth/signin`, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    let authed = false;
    for (let i = 0; i < 40; i++) { if ((await ctx.cookies()).some((c) => c.name.includes("session-token") && c.value)) { authed = true; break; } await page.waitForTimeout(500); }
    log("login:", authed);

    // create manga via API
    const mk = await page.request.post(`${BASE}/api/manga`, { data: { title: TITLE, slug: SLUG, description: "ทดสอบ bulk upload หลายตอน", type: "MANHWA" } });
    const slug = (await mk.json().catch(() => ({}))).slug || SLUG;
    log("manga created:", mk.status(), slug);

    // go to upload → chapter tab → bulk mode
    await page.goto(`${BASE}/upload`, { waitUntil: "domcontentloaded" });
    await page.click('button:has-text("อัปโหลดตอนใหม่")');
    await page.waitForSelector(`select option[value="${slug}"]`, { timeout: 15000 }).catch(() => {});
    await page.selectOption("select", slug).catch(() => {});
    await page.click('button:has-text("หลายตอน")');
    await page.waitForTimeout(500);

    // set the directory on the webkitdirectory input
    const dirInput = page.locator('input[type="file"][webkitdirectory], input[type="file"][directory]').first();
    log("dir input count:", await dirInput.count());
    try {
      await dirInput.setInputFiles(root);
      log("setInputFiles(dir) OK");
    } catch (e) {
      log("setInputFiles(dir) FAILED:", String(e).slice(0, 160));
      // fallback: pass individual files (tests groupFilesByChapter only if relPath survives)
    }
    await page.waitForTimeout(1500);
    const body = await page.locator("body").innerText();
    const m = body.match(/เลือกแล้ว (\d+) ตอน · (\d+) รูป/);
    log("folder selection picked up:", m ? `${m[1]} chapters, ${m[2]} images` : "NONE (bulkChapters empty)");

    // submit
    const submit = page.getByRole("button", { name: /อัปโหลด.*ตอน|อัปโหลดหลายตอน/ }).last();
    const disabled = await submit.isDisabled().catch(() => true);
    log("submit button disabled:", disabled);
    if (!disabled) {
      await submit.click();
      await page.waitForSelector("text=/เสร็จ · สำเร็จ/", { timeout: 90000 }).catch(() => {});
      const res = (await page.locator("body").innerText()).match(/เสร็จ · สำเร็จ (\d+) ตอน · ข้าม (\d+) · ล้มเหลว (\d+)/);
      log("bulk result:", res ? `ok=${res[1]} skipped=${res[2]} failed=${res[3]}` : "no result shown");
    }

    // verify via DB-ish: list chapters through the manga page
    await page.goto(`${BASE}/dashboard/manga/${enc(slug)}/chapters`, { waitUntil: "domcontentloaded" });
    const chCount = await page.locator('a[href*="reorder"]').count();
    log("chapters now in manage page:", chCount);

    // cleanup
    await page.request.delete(`${BASE}/api/manga/${enc(slug)}`);
  } catch (e) {
    log("EXCEPTION:", String(e).slice(0, 200));
  } finally {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
    await browser.close();
  }
})();
