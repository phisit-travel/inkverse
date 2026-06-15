import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { tipTranslator } from "@/lib/coins";
import { createNotification } from "@/lib/notifications";
import { apiError } from "@/lib/apiError";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ translatorId: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return apiError("AUTH-007", 401);

  const userId = (session.user as { id: string; username?: string }).id;
  const username = (session.user as { username?: string }).username ?? "ผู้อ่าน";
  const { translatorId } = await params;

  const rl = rateLimit(`tip:${userId}`, 10, 60_000);
  if (!rl.ok)
    return apiError("RATE-001", 429, {
      message: "ดำเนินการบ่อยเกินไป กรุณาลองใหม่",
      headers: { "Retry-After": String(rl.retryAfter) },
    });

  const body = await req.json().catch(() => ({}));
  const coins = Number(body?.coins);

  const result = await tipTranslator(userId, translatorId, coins);
  if (!result.success) {
    // Keep the machine error for the client; attach a code.
    const status = result.error === "TRANSLATOR_NOT_FOUND" ? 404 : 400;
    const code = result.error === "TRANSLATOR_NOT_FOUND" ? "VAL-002" : "COIN-001";
    return NextResponse.json({ error: result.error, code }, { status });
  }

  // Notify the translator (best-effort).
  const translator = await prisma.translator.findUnique({
    where: { id: translatorId },
    select: { userId: true },
  });
  if (translator) {
    await createNotification({
      userId: translator.userId,
      type: "RECEIVED_TIP",
      title: "ได้รับทิป!",
      body: `${username} ทิปคุณ ${coins} เหรียญ (฿${result.amountThb.toFixed(2)})`,
      link: "/dashboard/earnings",
    });
  }

  return NextResponse.json(result);
}
