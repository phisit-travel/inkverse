import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyFirstTopupBonus, extendVipDays, rewardReferralOnFirstTopup } from "@/lib/coins";

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

  // ── Real Omise card charge ────────────────────────────────────
  if (omise && method === "CARD") {
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
  }

  // ── Sandbox: allow without real charge when OMISE_SECRET_KEY not set ──
  const totalCoins = order.coins + order.bonus;

  const firstTopupBonus = await prisma.$transaction(async (tx) => {
    // Guard against double-credit: only a PENDING → PAID flip proceeds.
    const flipped = await tx.coinOrder.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "PAID", method, paidAt: new Date() },
    });
    if (flipped.count === 0) return 0;

    const bonus = await applyFirstTopupBonus(tx, userId, order.coins);
    if (order.vipDays > 0) await extendVipDays(tx, userId, order.vipDays);
    if (bonus > 0) await rewardReferralOnFirstTopup(tx, userId);
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
      data: { coins: { increment: totalCoins + bonus } },
    });
    return bonus;
  });

  return NextResponse.json({
    success: true,
    coinsAdded: totalCoins + firstTopupBonus,
    firstTopupBonus,
  });
}
