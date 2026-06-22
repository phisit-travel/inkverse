import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";

// OWNER/ADMIN only: remove an order (test/abandoned/spam). Guarded — an order
// that has received ANY money (deposit or balance) can NOT be hard-deleted, to
// preserve the financial record; cancel it instead. Unpaid orders are safe to
// remove outright.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN")
    return apiError("AUTH-008", 403);

  const { token } = await params;

  const order = await prisma.serviceOrder.findUnique({
    where: { accessToken: token },
    select: { id: true, depositPaidAt: true, balancePaidAt: true },
  });
  if (!order) return apiError("VAL-002", 404, { message: "ไม่พบออเดอร์นี้" });

  if (order.depositPaidAt || order.balancePaidAt)
    return apiError("VAL-003", 409, {
      message: "ออเดอร์ที่ชำระเงินแล้วลบไม่ได้ (เก็บไว้เป็นประวัติการเงิน)",
    });

  await prisma.serviceOrder.delete({ where: { id: order.id } });
  return NextResponse.json({ ok: true });
}
