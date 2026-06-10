import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unlockChaptersBulk } from "@/lib/coins";
import { rateLimit } from "@/lib/rate-limit";
import { maybeNotifyLowCoins } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const rl = rateLimit(`unlock-bulk:${userId}`, 10, 60_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "ดำเนินการบ่อยเกินไป กรุณารอสักครู่" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );

  const body = await req.json().catch(() => null);
  const chapterIds = body?.chapterIds;
  if (!Array.isArray(chapterIds) || chapterIds.some((id) => typeof id !== "string"))
    return NextResponse.json({ error: "chapterIds (string[]) required" }, { status: 400 });

  const result = await unlockChaptersBulk(userId, chapterIds);

  if (!result.success) {
    const status = result.error === "INSUFFICIENT_COINS" ? 402 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  await maybeNotifyLowCoins(userId, result.coinsLeft);
  return NextResponse.json(result);
}
