import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const userId = (session.user as { id: string }).id;
  const order = await prisma.coinOrder.findUnique({ where: { id: orderId } });

  if (!order || order.userId !== userId)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "PENDING")
    return NextResponse.json({ error: "Order already processed" }, { status: 409 });

  // ── Sandbox gate ─────────────────────────────────────────────
  // When PAYMENT_GATEWAY=stripe|omise, replace this block with
  // a real charge/session verification call.
  const sandboxMode = !process.env.PAYMENT_GATEWAY || process.env.PAYMENT_GATEWAY === "sandbox";

  if (!sandboxMode) {
    return NextResponse.json(
      { error: "Real payment not configured — set PAYMENT_GATEWAY" },
      { status: 501 }
    );
  }

  const totalCoins = order.coins + order.bonus;

  // Atomic: mark paid + credit coins + record transaction
  await prisma.$transaction([
    prisma.coinOrder.update({
      where: { id: orderId },
      data: { status: "PAID", method, paidAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { coins: { increment: totalCoins } },
    }),
    prisma.coinTransaction.create({
      data: {
        userId,
        amount: totalCoins,
        type: "TOPUP",
        description: `เติมเหรียญ ${totalCoins} เหรียญ (฿${order.price.toFixed(0)})`,
        refId: orderId,
      },
    }),
  ]);

  return NextResponse.json({ success: true, coinsAdded: totalCoins });
}
