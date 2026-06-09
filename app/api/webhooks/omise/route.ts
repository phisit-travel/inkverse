import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  // ── charge.complete → coin top-up ────────────────────────────────────────
  if (body.key === "charge.complete") {
    const charge = body.data as {
      id: string;
      status: string;
      metadata?: { orderId?: string };
    };

    if (charge.status === "successful") {
      const orderId = charge.metadata?.orderId;
      if (orderId) {
        const order = await prisma.coinOrder.findUnique({ where: { id: orderId } });
        if (order && order.status === "PENDING") {
          const totalCoins = order.coins + order.bonus;
          await prisma.$transaction([
            prisma.coinOrder.update({
              where: { id: orderId },
              data: { status: "PAID", paidAt: new Date(), omiseChargeId: charge.id },
            }),
            prisma.user.update({
              where: { id: order.userId },
              data: { coins: { increment: totalCoins } },
            }),
            prisma.coinTransaction.create({
              data: {
                userId: order.userId,
                amount: totalCoins,
                type: "TOPUP",
                description: `เติมเหรียญ ${totalCoins} เหรียญ (฿${order.price.toFixed(0)})`,
                refId: orderId,
              },
            }),
          ]);

          await createNotification({
            userId: order.userId,
            type: "TOPUP_SUCCESS",
            title: "เติมเหรียญสำเร็จ!",
            body: `คุณได้รับ ${totalCoins} เหรียญ (฿${order.price.toFixed(0)}) เรียบร้อยแล้ว`,
            link: "/topup",
          });
        }
      }
    }
    return NextResponse.json({ ok: true });
  }

  // ── transfer.complete / transfer.paid → withdrawal paid ──────────────────
  if (body.key === "transfer.complete" || body.key === "transfer.paid") {
    const transfer = body.data as { id: string; paid: boolean; failure_code?: string };

    const withdrawal = await prisma.withdrawalRequest.findFirst({
      where: { omiseTransferId: transfer.id, status: "PROCESSING" },
      include: { translator: { select: { userId: true } } },
    });

    if (withdrawal) {
      await prisma.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: { status: "PAID", processedAt: new Date() },
      });

      await createNotification({
        userId: withdrawal.translator.userId,
        type: "WITHDRAWAL_PAID",
        title: "โอนเงินเรียบร้อยแล้ว",
        body: `ยอดเงิน ฿${withdrawal.amount.toFixed(2)} ถูกโอนเข้าบัญชีของคุณเรียบร้อยแล้ว`,
        link: "/dashboard",
      });
    }
    return NextResponse.json({ ok: true });
  }

  // ── transfer.destroy → withdrawal failed ─────────────────────────────────
  if (body.key === "transfer.destroy") {
    const transfer = body.data as { id: string; failure_code?: string };

    const withdrawal = await prisma.withdrawalRequest.findFirst({
      where: { omiseTransferId: transfer.id, status: "PROCESSING" },
      include: { translator: { select: { userId: true } } },
    });

    if (withdrawal) {
      const note = transfer.failure_code
        ? `Transfer failed: ${transfer.failure_code}`
        : "Transfer failed";

      await prisma.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: { status: "FAILED", processedAt: new Date(), adminNote: note },
      });

      await createNotification({
        userId: withdrawal.translator.userId,
        type: "WITHDRAWAL_REJECTED",
        title: "การโอนเงินล้มเหลว",
        body: `การโอนเงิน ฿${withdrawal.amount.toFixed(2)} ล้มเหลว กรุณาติดต่อผู้ดูแลระบบ`,
        link: "/dashboard",
      });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
