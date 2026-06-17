// QA: payment FLOW only (no real payment, money logic untouched). Verifies the
// money invariants by observation: server-derived price, no coins until PAID,
// withdraw rejects without earnings. Creates throwaway PENDING orders only.
// Env: QA_EMAIL, QA_PASS (a TRANSLATOR so /withdraw is reachable too).
const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
const EMAIL = process.env.QA_EMAIL, PASS = process.env.QA_PASS;

const problems = [];
const steps = [];
function ok(s) { steps.push("  ✅ " + s); console.log("✅ " + s); }
function bad(s) { problems.push(s); steps.push("  ❌ " + s); console.log("❌ " + s); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const page = await ctx.newPage();
  const IGNORE = /DevTools|hydration|HMR|favicon|Warning: |\[Fast Refresh\]|cloudflarestorage|inkverse-private|\/api\/img\//i;
  page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) problems.push("console.error: " + m.text().slice(0, 140)); });
  page.on("response", (r) => { const u = r.url(); if (u.startsWith(BASE) && r.status() >= 500 && !/\/api\/img\//.test(u)) problems.push(`HTTP ${r.status()} ${r.request().method()} ${u.replace(BASE, "")}`); });

  try {
    // 1. login
    await page.goto(`${BASE}/auth/signin`, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    let authed = false;
    for (let i = 0; i < 40; i++) { if ((await ctx.cookies()).some((c) => c.name.includes("session-token") && c.value)) { authed = true; break; } await page.waitForTimeout(500); }
    if (!authed) { bad("login failed"); throw new Error("login"); }
    ok("login (translator) → session cookie set");

    // 2. /topup loads + packages
    const tp = await page.goto(`${BASE}/topup`, { waitUntil: "domcontentloaded" });
    tp && tp.status() < 400 ? ok("/topup page loads") : bad(`/topup failed (${tp ? tp.status() : "?"})`);
    const pkgs = (await (await page.request.get(`${BASE}/api/coin/packages`)).json().catch(() => ({})))?.packages || [];
    pkgs.length > 0 ? ok(`packages listed (${pkgs.length})`) : bad("no coin packages returned");
    const pkg = pkgs[0];

    // 3. balance before any order
    const coins0 = (await (await page.request.get(`${BASE}/api/coin/balance?t=${Date.now()}`)).json().catch(() => ({})))?.coins ?? null;

    // 4. create a normal order
    const ord = await page.request.post(`${BASE}/api/coin/order`, { data: { packageId: pkg.id } });
    const ordJson = await ord.json().catch(() => ({}));
    ord.ok() && ordJson.orderId ? ok(`order created (PENDING) for "${pkg.id}"`) : bad(`order create failed (${ord.status()})`);

    // 5. PromptPay QR + status + checkout for the PENDING order (no payment).
    // (Do this BEFORE the tampered order — re-ordering the same package would
    // auto-cancel this one, which is correct stale-order behavior.)
    if (ordJson.orderId) {
      const qr = await page.request.post(`${BASE}/api/coin/order/${ordJson.orderId}/promptpay`, { data: {} });
      const qrJson = await qr.json().catch(() => ({}));
      qr.ok() && qrJson.qrImage ? ok("PromptPay QR generated for the order") : bad(`PromptPay QR failed (${qr.status()} ${JSON.stringify(qrJson).slice(0, 80)})`);
      const st = await (await page.request.get(`${BASE}/api/coin/order/${ordJson.orderId}/status`)).json().catch(() => ({}));
      st.status === "PENDING" ? ok("order status = PENDING (unpaid)") : bad(`order status unexpected: ${JSON.stringify(st)}`);
      const co = await page.goto(`${BASE}/topup/checkout/${ordJson.orderId}`, { waitUntil: "domcontentloaded" });
      co && co.status() < 400 ? ok("checkout page renders") : bad(`checkout page failed (${co ? co.status() : "?"})`);
    }

    // 6. INVARIANT: server-derived amounts — tampered body must be ignored
    const tamper = await page.request.post(`${BASE}/api/coin/order`, { data: { packageId: pkg.id, price: 1, coins: 999999, bonus: 999999, vipDays: 999 } });
    const tamperJson = await tamper.json().catch(() => ({}));
    console.log("TAMPER_ORDER:" + (tamperJson.orderId || ""));
    console.log("PKG:" + pkg.coins + "," + pkg.price + "," + pkg.bonus);
    tamper.ok() && tamperJson.orderId ? ok("tampered order accepted (server price verified via DB below)") : bad("tampered order request errored");

    // 7. INVARIANT: no coins granted while PENDING
    await page.waitForTimeout(800);
    const coins1 = (await (await page.request.get(`${BASE}/api/coin/balance?t=${Date.now()}`)).json().catch(() => ({})))?.coins ?? null;
    coins1 === coins0 ? ok(`no coins granted while PENDING (balance stayed ${coins0})`) : bad(`balance changed without payment! ${coins0} → ${coins1}`);

    // 9. /withdraw (translator) loads + shows balance
    const wd = await page.goto(`${BASE}/dashboard/withdraw`, { waitUntil: "domcontentloaded" });
    wd && wd.status() < 400 && !page.url().includes("/apply") && page.url().includes("withdraw")
      ? ok("/withdraw page loads (translator)") : bad(`/withdraw failed (${wd ? wd.status() : "?"}, url ${page.url()})`);

    // 10. INVARIANT: withdraw rejected below minimum + without earnings
    const wMin = await page.request.post(`${BASE}/api/translator/withdraw`, { data: { amount: 50, accountName: "QA", accountNumber: "1234567", bankCode: "kbank" } });
    wMin.status() === 400 ? ok("withdraw below ฿100 minimum is rejected") : bad(`withdraw min check unexpected (${wMin.status()})`);
    const wNoBal = await page.request.post(`${BASE}/api/translator/withdraw`, { data: { amount: 100, accountName: "QA", accountNumber: "1234567", bankCode: "kbank" } });
    wNoBal.status() >= 400 ? ok(`withdraw without earnings is rejected (${wNoBal.status()})`) : bad("withdraw allowed with ฿0 earnings — money leak!");
  } catch (e) {
    bad("EXCEPTION: " + String(e).slice(0, 200));
  } finally {
    await browser.close();
  }

  console.log("\n===== QA PAYMENT FLOW REPORT =====");
  steps.forEach((s) => console.log(s));
  console.log(`\n${problems.length === 0 ? "🟢 ALL CLEAN" : "🔴 " + problems.length + " PROBLEM(S)"}`);
  if (problems.length) { console.log("\n--- problems ---"); [...new Set(problems)].forEach((p) => console.log(" • " + p)); }
  process.exit(problems.length ? 1 : 0);
})();
