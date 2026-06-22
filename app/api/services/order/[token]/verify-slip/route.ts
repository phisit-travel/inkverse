import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, servicePaymentEmail } from "@/lib/email";
import { uploadToR2Private } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";
import { apiError } from "@/lib/apiError";
import { getOrderByToken, paymentDue, applyVerifiedPayment } from "@/lib/services/orders";

// EasySlip API v1 — the image-upload endpoint EasySlip's own clients use.
// (v2 /verify/bank multipart is not parsed by standard HTTP clients; v1 works
//  with the same token and additionally returns the receiver account number.)
const EASYSLIP_URL = "https://developer.easyslip.com/api/v1/verify";
const MAX_SLIP_SIZE = 4 * 1024 * 1024; // 4 MB
const RECIPIENT = process.env.SERVICES_QUOTE_EMAIL || "madarotsa@gmail.com";

// Map EasySlip v1 error codes → friendly Thai messages.
const SLIP_ERRORS: Record<string, string> = {
  duplicate_slip: "สลิปนี้ถูกใช้ไปแล้ว",
  qrcode_not_found: "อ่าน QR ในสลิปไม่ได้ กรุณาอัปโหลดสลิปฉบับเต็มที่ชัดเจน",
  slip_not_found: "ไม่พบข้อมูลสลิป กรุณาอัปโหลดสลิปที่ถูกต้อง",
  invalid_image: "ไฟล์รูปไม่ถูกต้อง",
  image_size_too_large: "ไฟล์รูปใหญ่เกินไป (สูงสุด 4MB)",
  account_not_found: "ไม่พบบัญชีผู้ตรวจสลิป กรุณาติดต่อผู้ดูแลระบบ",
  application_expired: "ระบบตรวจสลิปหมดอายุ กรุณาติดต่อผู้ดูแลระบบ",
  application_deactivated: "ระบบตรวจสลิปถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
  quota_exceeded: "โควต้าตรวจสลิปเต็ม กรุณาลองใหม่ภายหลัง",
  access_denied: "ระบบตรวจสลิปไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
  unauthorized: "ระบบตรวจสลิปไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
};

interface EasySlipV1Response {
  status?: number;
  message?: string;
  data?: {
    transRef?: string;
    amount?: { amount?: number };
    receiver?: {
      bank?: { id?: string; name?: string; short?: string };
      account?: {
        name?: { th?: string; en?: string };
        bank?: { account?: string };
        proxy?: { account?: string };
      };
    };
  };
}

function digitsOf(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const easySlipToken = process.env.EASYSLIP_TOKEN;
  if (!easySlipToken)
    return apiError("COIN-002", 503, { message: "ระบบตรวจสลิปยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ" });

  const { token } = await params;

  // Each verify call hits the paid EasySlip API — throttle to stop quota/cost abuse.
  const rl = rateLimit(`svcverify:${token}`, 6, 5 * 60_000);
  if (!rl.ok)
    return apiError("RATE-001", 429, {
      message: "ตรวจสลิปบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
      headers: { "Retry-After": String(rl.retryAfter) },
    });

  const order = await getOrderByToken(token);
  if (!order) return apiError("VAL-002", 404, { message: "ไม่พบออเดอร์นี้" });

  const due = paymentDue(order);
  if (!due) return apiError("VAL-003", 409, { message: "ไม่มีรายการที่ต้องชำระ" });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return apiError("VAL-001", 400, { message: "กรุณาแนบรูปสลิป" });
  if (file.size > MAX_SLIP_SIZE)
    return apiError("UP-003", 413, { message: "ไฟล์สลิปใหญ่เกินไป (สูงสุด 4MB)" });

  const buffer = Buffer.from(await file.arrayBuffer());

  // ── Verify the slip with EasySlip v1 ─────────────────────────────────────
  let result: EasySlipV1Response;
  try {
    const fd = new FormData();
    fd.append("file", new File([buffer], file.name || "slip.jpg", { type: file.type || "image/jpeg" }));
    fd.append("checkDuplicate", "true");

    const res = await fetch(EASYSLIP_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${easySlipToken}` },
      body: fd,
    });
    result = await res.json();
  } catch {
    return apiError("COIN-002", 502, { message: "ตรวจสอบสลิปไม่สำเร็จ กรุณาลองใหม่" });
  }

  // v1: success has `data`; errors return `{ status, message: "<code>" }`.
  if (!result.data) {
    const code = result.message ?? "";
    const friendly = SLIP_ERRORS[code] ?? "ตรวจสอบสลิปไม่สำเร็จ กรุณาตรวจสอบรูปสลิป";
    return code === "duplicate_slip"
      ? apiError("COIN-003", 409, { message: friendly })
      : apiError("COIN-002", 422, { message: friendly });
  }

  const data = result.data;

  const transRef = data.transRef;
  if (!transRef)
    return apiError("COIN-002", 422, { message: "อ่านเลขอ้างอิงสลิปไม่ได้ กรุณาอัปโหลดสลิปที่ชัดเจน" });

  // ── Validate amount (must match exactly) ─────────────────────────────────
  const slipAmount = data.amount?.amount ?? 0;
  if (Math.abs(slipAmount - due.amount) > 0.01)
    return apiError("COIN-004", 422, {
      message: `ยอดในสลิป (฿${slipAmount.toFixed(2)}) ไม่ตรงกับยอดที่ต้องชำระ (฿${due.amount.toFixed(0)}) กรุณาโอนให้ตรงตามจำนวน`,
    });

  // ── Validate receiver is the shop's account ──────────────────────────────
  // v1 returns the (masked) receiver account number, e.g. "xxx-x-x3788-x".
  const last4 = process.env.PROMPTPAY_RECEIVER_LAST4?.trim();
  const expectName = process.env.PROMPTPAY_RECEIVER_NAME?.trim();
  if (last4 || expectName) {
    const acct = data.receiver?.account;
    const acctDigits = [acct?.bank?.account, acct?.proxy?.account].map(digitsOf);
    const receiverName = acct?.name?.th ?? "";
    const matched =
      (!!last4 && acctDigits.some((d) => d.includes(last4))) ||
      (!!expectName && receiverName.includes(expectName));
    if (!matched)
      return apiError("COIN-004", 422, { message: "บัญชีปลายทางในสลิปไม่ตรงกับบัญชีร้าน กรุณาตรวจสอบ" });
  }

  // ── Persist the slip image for records (best-effort) ─────────────────────
  let slipUrl: string | null = null;
  const r2Ready = !!(
    process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME &&
    process.env.CLOUDFLARE_R2_PUBLIC_URL
  );
  if (r2Ready) {
    try {
      const ext = (file.type?.split("/")[1] || "jpg").replace("jpeg", "jpg");
      slipUrl = await uploadToR2Private(`slips/service-${order.id}-${due.phase}.${ext}`, buffer, file.type || "image/jpeg");
    } catch {
      /* non-critical */
    }
  }

  // ── Record the verified payment (atomic conditional flip + slip dedupe) ───
  let applied: boolean;
  try {
    applied = await applyVerifiedPayment(order.id, due.phase, transRef, slipUrl);
  } catch (err: unknown) {
    // Unique violation on slipRef → this slip was already used for another payment.
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: string }).code)
        : "";
    if (code === "P2002")
      return apiError("COIN-003", 409, { message: "สลิปนี้ถูกใช้ไปแล้ว" });
    return apiError("NET-001", 500, {
      message: "บันทึกการชำระเงินไม่สำเร็จ กรุณาติดต่อผู้ดูแลระบบ",
    });
  }

  // Another concurrent request already applied this payment — return the current
  // status idempotently WITHOUT re-notifying.
  if (!applied) {
    const fresh = await prisma.serviceOrder.findUnique({
      where: { id: order.id },
      select: { status: true },
    });
    return NextResponse.json({ ok: true, status: fresh?.status ?? order.status });
  }

  const newStatus = due.phase === "deposit" ? "IN_PROGRESS" : "COMPLETED";

  // Notify the owner that a payment came in (best-effort, on-site + email).
  const phaseLabel = due.phase === "deposit" ? "มัดจำ" : "ส่วนที่เหลือ";
  try {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "SERVICE_PAYMENT",
          title: "รับชำระเงินบริการ",
          body: `ลูกค้าชำระ${phaseLabel} ออเดอร์ ${order.quoteNo} ฿${due.amount.toLocaleString()}`,
          link: "/admin",
        })),
      });
    }
  } catch {
    /* non-critical */
  }
  await sendEmail({
    to: RECIPIENT,
    subject: `รับชำระ${phaseLabel} ${order.quoteNo} · ฿${due.amount.toLocaleString()}`,
    html: servicePaymentEmail({
      quoteNo: order.quoteNo,
      phaseLabel,
      amount: due.amount,
      customerName: order.customerName,
    }),
  });

  return NextResponse.json({ ok: true, status: newStatus });
}
