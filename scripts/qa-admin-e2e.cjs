// QA: owner/admin dashboard (read-only — no approve/reject/transfer, those move
// money/roles). Verifies every admin page renders for an ADMIN, the list APIs
// return data, and that a non-admin is correctly locked out.
// Env: QA_EMAIL, QA_PASS (an ADMIN).
const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
const EMAIL = process.env.QA_EMAIL, PASS = process.env.QA_PASS;

const problems = [];
const steps = [];
function ok(s) { steps.push("  ✅ " + s); console.log("✅ " + s); }
function bad(s) { problems.push(s); steps.push("  ❌ " + s); console.log("❌ " + s); }

async function login(ctx, page, email, pass) {
  await page.goto(`${BASE}/auth/signin`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  for (let i = 0; i < 40; i++) { if ((await ctx.cookies()).some((c) => c.name.includes("session-token") && c.value)) return true; await page.waitForTimeout(500); }
  return false;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const page = await ctx.newPage();
  const IGNORE = /DevTools|hydration|HMR|favicon|Warning: |\[Fast Refresh\]|cloudflarestorage|inkverse-private|\/api\/img\//i;
  page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) problems.push("console.error: " + m.text().slice(0, 140)); });
  page.on("pageerror", (e) => problems.push("pageerror: " + String(e).slice(0, 140)));
  page.on("response", (r) => { const u = r.url(); if (u.startsWith(BASE) && r.status() >= 500 && !/\/api\/img\//.test(u)) problems.push(`HTTP ${r.status()} ${u.replace(BASE, "")}`); });

  try {
    if (!(await login(ctx, page, EMAIL, PASS))) { bad("admin login failed"); throw new Error("login"); }
    ok("login (admin) → session cookie set");

    // ── Admin pages render for an ADMIN ─────────────────────────
    for (const [label, path] of [
      ["dashboard", "/admin"],
      ["applications", "/admin/applications"],
      ["coin-packages", "/admin/coin-packages"],
      ["contact", "/admin/contact"],
      ["verifications", "/admin/verifications"],
      ["withdrawals", "/admin/withdrawals"],
    ]) {
      const r = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      const st = r ? r.status() : 0;
      const stayed = !page.url().includes("/auth/") && page.url().includes("/admin");
      st < 400 && stayed ? ok(`${label} page renders (${st})`) : bad(`${label} failed (status ${st}, url ${page.url()})`);
    }

    // ── Admin list APIs return data (read-only) ─────────────────
    for (const [label, path] of [
      ["applications API", "/api/admin/applications"],
      ["withdrawals API", "/api/admin/withdrawals"],
      ["coin-packages API", "/api/admin/coin-packages"],
    ]) {
      const r = await page.request.get(`${BASE}${path}`);
      let shapeOk = false;
      try { const j = await r.json(); shapeOk = Array.isArray(j) || Array.isArray(j?.data) || typeof j === "object"; } catch {}
      r.ok() && shapeOk ? ok(`${label} returns data (${r.status()})`) : bad(`${label} failed (${r.status()})`);
    }

    // ── Admin dashboard shows real platform stats ───────────────
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const body = await page.locator("body").innerText();
    /ผู้ใช้|รายได้|มังงะ|สถิติ|users|revenue|ยอด|บาท|฿|\d/.test(body) ? ok("admin dashboard shows stats content") : bad("admin dashboard looks empty");
  } catch (e) {
    bad("EXCEPTION: " + String(e).slice(0, 200));
  } finally {
    await browser.close();
  }

  // ── Security: a non-admin must be locked out of /admin ────────
  const browser2 = await chromium.launch();
  try {
    const ctx2 = await browser2.newContext();
    const page2 = await ctx2.newPage();
    page2.on("pageerror", () => {});
    if (process.env.QA_READER_EMAIL && await login(ctx2, page2, process.env.QA_READER_EMAIL, process.env.QA_READER_PASS)) {
      await page2.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
      const lockedOut = !page2.url().includes("/admin");
      lockedOut ? ok("non-admin is redirected away from /admin (guard works)") : bad("NON-ADMIN reached /admin — access control hole!");
      const apiR = await page2.request.get(`${BASE}/api/admin/withdrawals`);
      apiR.status() === 401 || apiR.status() === 403 ? ok(`non-admin blocked from admin API (${apiR.status()})`) : bad(`non-admin got admin API (${apiR.status()})!`);
    } else {
      console.log("  (skipped non-admin guard test — no QA_READER_EMAIL provided)");
    }
  } catch (e) { bad("guard-test EXCEPTION: " + String(e).slice(0, 120)); } finally { await browser2.close(); }

  console.log("\n===== QA OWNER/ADMIN REPORT =====");
  steps.forEach((s) => console.log(s));
  console.log(`\n${problems.length === 0 ? "🟢 ALL CLEAN" : "🔴 " + problems.length + " PROBLEM(S)"}`);
  if (problems.length) { console.log("\n--- problems ---"); [...new Set(problems)].forEach((p) => console.log(" • " + p)); }
  process.exit(problems.length ? 1 : 0);
})();
