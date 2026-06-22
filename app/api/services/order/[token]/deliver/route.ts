import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";

// OWNER/ADMIN only: mark an in-progress order as delivered (attach the delivery
// link/note). Guarded flip — only an IN_PROGRESS order can become DELIVERED, so
// concurrent/duplicate calls can't move it backward. The customer's final file
// link is gated behind the balance payment (see publicOrderView) — EXCEPT a
// fully-free job (balance ฿0) has nothing left to pay, so it completes on
// delivery and the file is released immediately.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN")
    return apiError("AUTH-008", 403);

  const { token } = await params;

  const body = (await req.json().catch(() => ({}))) as {
    deliveryUrl?: string;
    deliveryNote?: string;
  };
  const deliveryUrl =
    typeof body.deliveryUrl === "string" && body.deliveryUrl.trim()
      ? body.deliveryUrl.trim().slice(0, 1000)
      : null;
  const deliveryNote =
    typeof body.deliveryNote === "string" && body.deliveryNote.trim()
      ? body.deliveryNote.trim().slice(0, 4000)
      : null;

  const order = await prisma.serviceOrder.findUnique({
    where: { accessToken: token },
    select: { balance: true },
  });
  if (!order) return apiError("VAL-002", 404, { message: "ไม่พบออเดอร์นี้" });

  // No balance left to collect → complete now; otherwise hold at DELIVERED until paid.
  const nextStatus = order.balance > 0 ? "DELIVERED" : "COMPLETED";

  const r = await prisma.serviceOrder.updateMany({
    where: { accessToken: token, status: "IN_PROGRESS" },
    data: { status: nextStatus, deliveredAt: new Date(), deliveryUrl, deliveryNote },
  });
  if (r.count === 0)
    return apiError("VAL-003", 409, { message: "ออเดอร์ไม่อยู่ในสถานะที่ส่งมอบได้" });

  return NextResponse.json({ ok: true, status: nextStatus });
}
