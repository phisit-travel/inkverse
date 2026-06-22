import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { apiError } from "@/lib/apiError";
import { getOrderByToken } from "@/lib/services/orders";

// Customer fills the creative brief for their order. Token-authed (the access
// token from the order is the only credential — no login required).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!rateLimit(`svcbrief:${token}`, 10, 60_000).ok) {
    return apiError("RATE-001", 429, { message: "บันทึกบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" });
  }

  const order = await getOrderByToken(token);
  if (!order) return apiError("VAL-002", 404, { message: "ไม่พบออเดอร์นี้" });
  if (order.status === "COMPLETED" || order.status === "CANCELLED")
    return apiError("VAL-003", 409, { message: "ออเดอร์นี้ปิดแล้ว" });

  const body = (await req.json().catch(() => ({}))) as {
    genre?: string;
    voice?: string;
    focus?: string;
    briefNote?: string;
  };

  const str = (v: unknown, max: number) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

  await prisma.serviceOrder.update({
    where: { id: order.id },
    data: {
      genre: str(body.genre, 500),
      voice: str(body.voice, 500),
      focus: str(body.focus, 500),
      briefNote: str(body.briefNote, 4000),
      briefAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
