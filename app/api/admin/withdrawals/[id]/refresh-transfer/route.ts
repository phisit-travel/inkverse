import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTransferStatus } from "@/lib/omise-payout";
import { apiError } from "@/lib/apiError";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return apiError("AUTH-008", 401);
  }

  const { id } = await params;
  const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id } });
  if (!withdrawal) return apiError("VAL-002", 404, { message: "ไม่พบคำขอถอนเงิน" });
  if (!withdrawal.omiseTransferId) {
    return apiError("VAL-001", 400, { message: "ไม่มี Omise transfer ID" });
  }

  const status = await getTransferStatus(withdrawal.omiseTransferId);
  if (!status) return apiError("COIN-007", 502, { message: "ดึงสถานะจาก Omise ไม่สำเร็จ" });

  // Auto-update if Omise says it's paid
  if (status.paid && withdrawal.status === "PROCESSING") {
    await prisma.withdrawalRequest.update({
      where: { id },
      data: { status: "PAID", processedAt: new Date() },
    });
  }

  return NextResponse.json(status);
}
