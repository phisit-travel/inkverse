import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFirstTopup, extendVipDays, rewardReferralOnFirstTopup } from "@/lib/coins";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const omise = process.env.OMISE_SECRET_KEY
  ? require("omise")({ secretKey: process.env.OMISE_SECRET_KEY, omiseVersion: "2019-05-29" })
  : null;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await params;
  const body = await req.json().catch(() => ({}));
  const method = (body?.method as string) ?? "CARD";
  const omiseToken = body?.omiseToken as string | undefined;

  const userId = (session.user as { id: string }).id;
  const order = await prisma.coinOrder.findUnique({ where: { id: orderId } });

  if (!order || order.userId !== userId)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "PENDING")
    return NextResponse.json({ error: "Order already processed" }, { status: 409 });

  // This endpoint handles CARD charges ONLY. Other channels (PromptPay slip,
  // mobile banking, e-wallet) credit via their own verified routes / the webhook.
  // Never accept a non-CARD method here — that previously let callers skip the
  // charge and mint coins for free.
  if (method !== "CARD")
    return NextResponse.json({ error: "ช่องทางชำระเงินไม่ถูกต้อง" }, { status: 400 });

  // Sandbox (no real charge) is allowed ONLY when explicitly enabled — never by
  // default, and never in production.
  const sandbox = process.env.ALLOW_SANDBOX_PAYMENTS === "true";

  // ── Real Omise card charge — must succeed before any coins are credited ──
  if (omise) {
    if (!omiseToken)
      return NextResponse.json({ error: "omiseToken required" }, { status: 400 });

    let charge: { status: string; failure_message?: string };
    try {
      charge = await omise.charges.create({
        amount: Math.round(order.price * 100), // satang (1 THB = 100 satang)
        currency: "thb",
        card: omiseToken,
        description: `INKVERSE ${order.coins + order.bonus} coins`,
      });
    } catch (err: unknown) {
      // Omise SDK throws plain objects, not Error instances
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as Record<string, unknown>).message)
          : "เกิดข้อผิดพลาดในการชำระเงิน";
      console.error("[Omise charge error]", err);
      return NextResponse.json({ error: msg }, { status: 402 });
    }

    if (charge.status !== "successful") {
      await prisma.coinOrder.update({ where: { id: orderId }, data: { status: "FAILED" } });
      return NextResponse.json(
        { error: charge.failure_message ?? "บัตรถูกปฏิเสธ กรุณาตรวจสอบข้อมูล" },
        { status: 402 }
      );
    }
  } else if (!sandbox) {
    // No payment processor configured and sandbox not explicitly enabled → refuse.
    return NextResponse.json(
      { error: "ระบบชำระเงินยังไม่พร้อมใช้งาน" },
      { status: 503 }
    );
  }

  // Reaching here means: a successful Omise charge, or explicit sandbox mode.
  const totalCoins = order.coins + order.bonus;

  await prisma.$transaction(async (tx) => {
    // Guard against double-credit: only a PENDING → PAID flip proceeds.
    const flipped = await tx.coinOrder.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "PAID", method, paidAt: new Date() },
    });
    if (flipped.count === 0) return;

    const firstTopup = await isFirstTopup(tx, userId);
    if (order.vipDays > 0) await extendVipDays(tx, userId, order.vipDays);
    if (firstTopup) await rewardReferralOnFirstTopup(tx, userId);
    await tx.coinTransaction.create({
      data: {
        userId,
        amount: totalCoins,
        type: "TOPUP",
        description: `เติมเหรียญ ${totalCoins} เหรียญ (฿${order.price.toFixed(0)})`,
        refId: orderId,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { coins: { increment: totalCoins } },
    });
  });

  return NextResponse.json({ success: true, coinsAdded: totalCoins });
}
