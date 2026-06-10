import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Self-hosted PromptPay: we display our own static PromptPay QR image and let
// the user pay, then confirm via slip verification (see ./verify-slip).
// No payment gateway involved.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await params;
  const userId = (session.user as { id: string }).id;
  const order = await prisma.coinOrder.findUnique({ where: { id: orderId } });

  if (!order || order.userId !== userId)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "PENDING")
    return NextResponse.json({ error: "Order already processed" }, { status: 409 });

  const qrImage = process.env.PROMPTPAY_QR_IMAGE;
  if (!qrImage)
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า QR PromptPay กรุณาติดต่อผู้ดูแลระบบ" },
      { status: 503 }
    );

  // Tag the order as a PromptPay payment so reporting is consistent.
  if (order.method !== "PROMPTPAY") {
    await prisma.coinOrder.update({
      where: { id: orderId },
      data: { method: "PROMPTPAY" },
    });
  }

  return NextResponse.json({
    qrImage,
    accountName: process.env.PROMPTPAY_ACCOUNT_NAME ?? null,
    amount: order.price,
    autoVerify: !!process.env.EASYSLIP_TOKEN,
  });
}
