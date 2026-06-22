import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Search crawlers, social unfurlers, headless automation (incl. our own
// Playwright screenshots → "HeadlessChrome") and scripted HTTP clients. Any of
// these that execute the page JS would otherwise fire the beacon — drop them so
// the count reflects real human visitors only.
const BOT_UA =
  /bot|crawl|spider|slurp|mediapartners|bingpreview|facebookexternalhit|facebot|embedly|pinterest|telegrambot|whatsapp|discordbot|skypeuripreview|headless|phantom|puppeteer|playwright|python-requests|aiohttp|axios|node-fetch|curl|wget|go-http|java\/|libwww|okhttp|scrapy|ahrefs|semrush|mj12|dotbot|petalbot|bytespider|yandex|baidu|duckduck|applebot|amazonbot|gptbot|claudebot|ccbot|chatgpt/i;

// Lightweight page-view counter. Anonymous visitors add no auth DB cost
// (no token → auth() returns null fast). Admins browsing their own site
// and bots/crawlers are NOT counted.
export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  // No UA, or a known bot/crawler/headless UA → don't count.
  if (!ua || BOT_UA.test(ua)) {
    return NextResponse.json({ ok: true, skipped: "bot" });
  }

  const session = await auth();
  if (session?.user && (session.user as { role?: string }).role === "ADMIN") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const today = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  const jar = await cookies();
  const isNewVisitToday = jar.get("iv_day")?.value !== today;

  try {
    await prisma.dailyStat.upsert({
      where: { day: today },
      create: { day: today, pageViews: 1, visitors: isNewVisitToday ? 1 : 0 },
      update: {
        pageViews: { increment: 1 },
        ...(isNewVisitToday ? { visitors: { increment: 1 } } : {}),
      },
    });
  } catch {
    /* non-critical */
  }

  const res = NextResponse.json({ ok: true });
  if (isNewVisitToday) {
    res.cookies.set("iv_day", today, { maxAge: 60 * 60 * 24 * 2, sameSite: "lax", path: "/" });
  }
  return res;
}
