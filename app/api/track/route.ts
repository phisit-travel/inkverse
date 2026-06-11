import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Lightweight page-view counter. Anonymous visitors add no auth DB cost
// (no token → auth() returns null fast). Admins browsing their own site
// are NOT counted.
export async function POST() {
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
