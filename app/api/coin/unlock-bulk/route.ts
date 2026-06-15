import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unlockChaptersBulk } from "@/lib/coins";
import { rateLimit } from "@/lib/rate-limit";
import { maybeNotifyLowCoins } from "@/lib/notifications";
import { apiError } from "@/lib/apiError";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return apiError("AUTH-007", 401);

  const userId = (session.user as { id: string }).id;

  const rl = rateLimit(`unlock-bulk:${userId}`, 10, 60_000);
  if (!rl.ok)
    return apiError("RATE-001", 429, {
      message: "ดำเนินการบ่อยเกินไป กรุณารอสักครู่",
      headers: { "Retry-After": String(rl.retryAfter) },
    });

  const body = await req.json().catch(() => null);
  const chapterIds = body?.chapterIds;
  if (!Array.isArray(chapterIds) || chapterIds.some((id) => typeof id !== "string"))
    return apiError("VAL-001", 400, { message: "ต้องระบุรายการตอน (chapterIds)" });

  const result = await unlockChaptersBulk(userId, chapterIds);

  if (!result.success) {
    // Keep the machine-readable error for the client; attach a code too.
    const status = result.error === "INSUFFICIENT_COINS" ? 402 : 400;
    const code = result.error === "INSUFFICIENT_COINS" ? "COIN-001" : "COIN-005";
    return NextResponse.json({ error: result.error, code }, { status });
  }

  await maybeNotifyLowCoins(userId, result.coinsLeft);
  return NextResponse.json(result);
}
