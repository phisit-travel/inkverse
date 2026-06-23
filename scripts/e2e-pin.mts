// Playwright e2e for the PIN login gate. Drives the real UI on the dev server.
// Run: node scripts/e2e-pin.mts   (after `npm run dev` + e2e-pin-setup.mts)
import { chromium, type Browser, type Page } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, extra = "") {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

let ipSeq = 1;
async function makeCtx(browser: Browser) {
  // Distinct client IP per context so the proxy flood-guard (keyed by IP) doesn't
  // lump all the test traffic into one bucket and 429 the auth calls.
  const ctx = await browser.newContext({
    extraHTTPHeaders: { "x-real-ip": `10.10.10.${ipSeq++}` },
  });
  // Suppress the recruitment WelcomePopup (a full-screen overlay that would
  // intercept clicks) by pre-seeding its "seen" flag.
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("ivRecruitSeen", "1");
    } catch {}
  });
  return ctx;
}

async function login(page: Page, email: string) {
  await page.goto(`${BASE}/auth/signin`, { waitUntil: "load" });
  await page.waitForTimeout(1500); // let React hydrate so the submit handler attaches
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "password123");
  await page.click('form button[type="submit"]');
  // signin does window.location.href = callbackUrl on success → wait until we
  // leave the signin page (don't rely on networkidle — background polling never
  // settles it).
  await page.waitForURL((u) => !u.pathname.startsWith("/auth/signin"), {
    timeout: 20000,
  });
}

async function run() {
  const browser: Browser = await chromium.launch();
  try {
    // ── 1. PIN user is gated → redirected to /auth/pin ───────────────────────
    {
      const ctx = await makeCtx(browser);
      const page = await ctx.newPage();
      await login(page, "e2e-pin@test.local");
      // After login, going to a protected page should bounce to /auth/pin.
      await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
      ok("PIN user redirected to /auth/pin", /\/auth\/pin/.test(page.url()), `(url=${page.url()})`);

      // ── 2. Wrong PIN shows error, stays on gate ───────────────────────────
      const inputs = page.locator('input[inputmode="numeric"]');
      await inputs.first().waitFor({ state: "visible", timeout: 10000 });
      const n = await inputs.count();
      ok("gate renders 6 PIN inputs", n === 6, `(got ${n})`);
      for (let i = 0; i < 6; i++) await inputs.nth(i).fill("9"); // 999999 wrong
      await page.waitForTimeout(1500);
      const stillGated = /\/auth\/pin/.test(page.url());
      ok("wrong PIN keeps user on gate", stillGated, `(url=${page.url()})`);

      // ── 3. Correct PIN unlocks ────────────────────────────────────────────
      const inputs2 = page.locator('input[inputmode="numeric"]');
      const digits = "123456";
      for (let i = 0; i < 6; i++) await inputs2.nth(i).fill(digits[i]);
      // Auto-submits on the 6th digit → verify → update() → redirect to callbackUrl.
      await page
        .waitForURL((u) => !u.pathname.startsWith("/auth/pin"), { timeout: 15000 })
        .catch(() => {});
      const unlocked = !/\/auth\/pin/.test(page.url());
      ok("correct PIN unlocks (left gate)", unlocked, `(url=${page.url()})`);

      // Now a protected page should load without redirect.
      await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
      ok("after unlock /settings loads (not gated)", /\/settings/.test(page.url()), `(url=${page.url()})`);
      await ctx.close();
    }

    // ── 4. No-PIN user passes straight through ───────────────────────────────
    {
      const ctx = await makeCtx(browser);
      const page = await ctx.newPage();
      await login(page, "e2e-nopin@test.local");
      await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
      ok("no-PIN user not gated", /\/settings/.test(page.url()), `(url=${page.url()})`);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
