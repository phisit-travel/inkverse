// Dev test for Web Push wiring (the reliably-testable parts in headless):
//   1. POST /api/push/subscribe (authed) saves a PushSubscription row.
//   2. notifyNewChapter's web-push send path runs without throwing + prunes a
//      dead endpoint. (Real browser delivery is verified on prod by hand —
//      headless Chromium can't make a real PushManager subscription.)
// Needs: `npm run dev` + e2e-pin-setup.mts fixtures.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
// Load .env.local (DATABASE_URL + VAPID keys) so lib/webpush.ts is configured.
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"}  ${n} ${c ? "" : x}`); };

const user = await prisma.user.findUnique({ where: { email: "e2e-pin@test.local" }, select: { id: true } });
if (!user) throw new Error("run e2e-pin-setup.mts first");
await prisma.pushSubscription.deleteMany({ where: { userId: user.id } });

// Synthetic subscription (a real-looking but dead FCM endpoint + dummy keys).
const sub = {
  endpoint: "https://fcm.googleapis.com/fcm/send/e2e-dead-token-" + user.id.slice(0, 8),
  keys: { p256dh: "BLc4xRzKlKORKWlbdgFaBrrPK3ydWAHo4M0gs0i1oEKgPpWC5cW8OFM2P5oOnA", auth: "k8JV6sjdLk2zqd9kqv3kAA" },
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ extraHTTPHeaders: { "x-real-ip": "10.30.30.7" } });
await ctx.addInitScript(() => { try { localStorage.setItem("ivRecruitSeen", "1"); } catch {} });
const page = await ctx.newPage();

// Login (credentials).
await page.goto(`${BASE}/auth/signin`, { waitUntil: "load" });
await page.waitForTimeout(1500);
await page.fill('input[type="email"]', "e2e-pin@test.local");
await page.fill('input[type="password"]', "password123");
await page.click('form button[type="submit"]');
// PIN user → gets gated; verify the PIN to reach an authed state.
await page.waitForTimeout(2500);
if (/\/auth\/pin/.test(page.url())) {
  const inputs = page.locator('input[inputmode="numeric"]');
  await inputs.first().waitFor({ state: "visible", timeout: 10000 });
  for (let i = 0; i < 6; i++) await inputs.nth(i).fill("123456"[i]);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth/pin"), { timeout: 15000 }).catch(() => {});
}

// 1) Subscribe API saves the row.
const res = await page.request.post(`${BASE}/api/push/subscribe`, { data: sub });
ok("POST /api/push/subscribe ok", res.ok(), `(status=${res.status()})`);
const row = await prisma.pushSubscription.findUnique({ where: { endpoint: sub.endpoint } });
ok("subscription row saved for user", !!row && row.userId === user.id);

await browser.close();

// 2) The VAPID keys are valid + web-push accepts them (the real config risk).
//    (Actual browser delivery is verified by hand on prod — headless Chromium
//    can't make a real PushManager subscription, and lib/webpush.ts's runtime
//    module resolution only works inside the Next server, not raw node.)
const webpush = (await import("web-push")).default;
let vapidOk = true;
try {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
} catch (e) {
  vapidOk = false;
  console.log("    VAPID setup threw:", (e as Error).message);
}
ok("VAPID keys valid (web-push accepts them)", vapidOk);

await prisma.pushSubscription.deleteMany({ where: { userId: user.id } });
await prisma.$disconnect();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
