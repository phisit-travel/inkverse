import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { tipTranslator } from "@/lib/coins";
import { createNotification } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ translatorId: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string; username?: string }).id;
  const username = (session.user as { username?: string }).username ?? "ผู้อ่าน";
  const { translatorId } = await params;

  const rl = rateLimit(`tip:${userId}`, 10, 60_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "ดำเนินการบ่อยเกินไป กรุณาลองใหม่" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );

  const body = await req.json().catch(() => ({}));
  const coins = Number(body?.coins);

  const result = await tipTranslator(userId, translatorId, coins);
  if (!result.success) {
    const status = result.error === "TRANSLATOR_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
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
