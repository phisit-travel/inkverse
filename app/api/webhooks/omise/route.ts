import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

// Omise does not sign webhooks, so the POST body cannot be trusted: anyone who
// knows this URL could forge a `charge.complete` event and mint coins. We treat
// the body only as a *hint* (which object id changed) and re-fetch the real
// object from the Omise API with our secret key before acting on it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const omise = process.env.OMISE_SECRET_KEY
  ? require("omise")({ secretKey: process.env.OMISE_SECRET_KEY, omiseVersion: "2019-05-29" })
  : null;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  // Without a secret key we cannot verify anything → never mutate state.
  if (!omise) return NextResponse.json({ ok: true });

  const key = body.key as string | undefined;
  const objectId = body.data?.id as string | undefined;
  if (!objectId) return NextResponse.json({ ok: true });

  // ── charge.complete → coin top-up ────────────────────────────────────────
  if (key === "charge.complete") {
    let charge: {
      id: string;
      status: string;
      paid?: boolean;
      amount: number;
      currency: string;
      metadata?: { orderId?: string };
    };
    try {
      charge = await omise.charges.retrieve(objectId);
    } catch {
      // Transient Omise error → let Omise retry the webhook.
      return NextResponse.json({ ok: false }, { status: 502 });
    }

    // Authoritative checks against the real charge, not the request body.
    if (charge.status !== "successful" || charge.paid === false)
      return NextResponse.json({ ok: true });

    const orderId = charge.metadata?.orderId;
    if (!orderId) return NextResponse.json({ ok: true });

    const order = await prisma.coinOrder.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ ok: true });

    // The charge must actually pay for THIS order's amount/currency.
    if (
      charge.currency?.toLowerCase() !== "thb" ||
      charge.amount !== Math.round(order.price * 100)
    )
      return NextResponse.json({ ok: true });

    const totalCoins = order.coins + order.bonus;
    let credited = false;
    await prisma.$transaction(async (tx) => {
      // Idempotent: only the first PENDING → PAID flip credits coins.
      const flipped = await tx.coinOrder.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "PAID", paidAt: new Date(), omiseChargeId: charge.id },
      });
      if (flipped.count === 0) return;
      credited = true;

      await tx.user.update({
        where: { id: order.userId },
        data: { coins: { increment: totalCoins } },
      });
      await tx.coinTransaction.create({
        data: {
          userId: order.userId,
          amount: totalCoins,
          type: "TOPUP",
          description: `เติมเหรียญ ${totalCoins} เหรียญ (฿${order.price.toFixed(0)})`,
          refId: orderId,
        },
      });
    });

    // Notify only on the delivery that actually credited (not on retries).
    if (credited) {
      await createNotification({
        userId: order.userId,
        type: "TOPUP_SUCCESS",
        title: "เติมเหรียญสำเร็จ!",
        body: `คุณได้รับ ${totalCoins} เหรียญ (฿${order.price.toFixed(0)}) เรียบร้อยแล้ว`,
        link: "/topup",
      });
    }
    return NextResponse.json({ ok: true });
  }

  // ── transfer.complete / transfer.paid → withdrawal paid ──────────────────
  if (key === "transfer.complete" || key === "transfer.paid") {
    let transfer: { id: string; paid?: boolean; sent?: boolean };
    try {
      transfer = await omise.transfers.retrieve(objectId);
    } catch {
      return NextResponse.json({ ok: false }, { status: 502 });
    }
    if (!transfer.paid) return NextResponse.json({ ok: true });

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
  if (key === "transfer.destroy") {
    let transfer: { id: string; paid?: boolean; failure_code?: string };
    try {
      transfer = await omise.transfers.retrieve(objectId);
    } catch {
      // A destroyed transfer may no longer be retrievable; trust the event id
      // only to look up our own record, and never mark a PAID one as failed.
      transfer = { id: objectId };
    }
    if (transfer.paid) return NextResponse.json({ ok: true });

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
