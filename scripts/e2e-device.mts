// e2e for device-name self-heal. Simulates a session created with a missing UA
// (the web-Google bug → device "อุปกรณ์ไม่ทราบชื่อ"), then verifies that opening
// the device list relabels the current session from the live request's UA.
// Needs: `npm run dev` on :3000 + e2e-pin-setup.mts fixtures.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
if (!process.env.DATABASE_URL) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^DATABASE_URL=(.*)$/);
    if (m) process.env.DATABASE_URL = m[1];
  }
}
const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

let pass = 0,
  fail = 0;
const ok = (n: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  console.log(`  ${c ? "PASS" : "FAIL"}  ${n} ${c ? "" : x}`);
};

const user = await prisma.user.findUnique({
  where: { email: "e2e-nopin@test.local" },
  select: { id: true },
});
if (!user) throw new Error("run e2e-pin-setup.mts first");

// Fresh slate.
await prisma.userSession.deleteMany({ where: { userId: user.id } });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  extraHTTPHeaders: { "x-real-ip": "10.20.20.5" },
});
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("ivRecruitSeen", "1");
  } catch {}
});
const page = await ctx.newPage();

// Login (creates a session row with the real Chrome UA).
await page.goto(`${BASE}/auth/signin`, { waitUntil: "load" });
await page.waitForTimeout(1500);
await page.fill('input[type="email"]', "e2e-nopin@test.local");
await page.fill('input[type="password"]', "password123");
await page.click('form button[type="submit"]');
await page.waitForURL((u) => !u.pathname.startsWith("/auth/signin"), { timeout: 20000 });

let rows = await prisma.userSession.findMany({ where: { userId: user.id } });
ok("login created exactly 1 session", rows.length === 1, `(got ${rows.length})`);
ok("session captured a name at login", rows[0]?.device === "Chrome · Windows", `(device=${rows[0]?.device})`);

// Simulate the broken-capture state: blank the name + UA like a bad Google login.
await prisma.userSession.updateMany({
  where: { userId: user.id },
  data: { device: "อุปกรณ์ไม่ทราบชื่อ", userAgent: null },
});

// Open the device list (carries the browser cookies + UA) → should self-heal.
const resp = await page.request.get(`${BASE}/api/account/sessions`);
ok("device list API ok", resp.ok(), `(status=${resp.status()})`);

rows = await prisma.userSession.findMany({ where: { userId: user.id } });
ok(
  "current device relabeled from live UA",
  rows[0]?.device === "Chrome · Windows",
  `(device=${rows[0]?.device})`
);

await browser.close();
await prisma.$disconnect();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
