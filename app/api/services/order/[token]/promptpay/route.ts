import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/apiError";
import { getOrderByToken, paymentDue } from "@/lib/services/orders";

// Self-hosted PromptPay: show our static QR for the amount currently due
// (deposit or balance) and let the customer pay, then confirm via slip
// verification (see ./verify-slip). No payment gateway involved.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const order = await getOrderByToken(token);
  if (!order) return apiError("VAL-002", 404, { message: "ไม่พบออเดอร์นี้" });

  const due = paymentDue(order);
  if (!due) return apiError("VAL-003", 409, { message: "ไม่มีรายการที่ต้องชำระ" });

  const qrImage = process.env.PROMPTPAY_QR_IMAGE;
  if (!qrImage)
    return apiError("COIN-007", 503, {
      message: "ยังไม่ได้ตั้งค่า QR PromptPay กรุณาติดต่อผู้ดูแลระบบ",
    });

  return NextResponse.json({
    qrImage,
    accountName: process.env.PROMPTPAY_ACCOUNT_NAME ?? null,
    amount: due.amount,
    phase: due.phase,
    autoVerify: !!process.env.EASYSLIP_TOKEN,
  });
}
