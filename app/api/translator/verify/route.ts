import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { requestVerification, VERIFY_FEE_COINS } from "@/lib/coins";
import { notifyAdmins } from "@/lib/notifications";
import { apiError } from "@/lib/apiError";

export async function POST() {
  const session = await auth();
  if (!session?.user)
    return apiError("AUTH-007", 401);

  const userId = (session.user as { id: string; username?: string }).id;
  const username = (session.user as { username?: string }).username ?? "นักแปล";

  const rl = rateLimit(`verify-req:${userId}`, 3, 60 * 60_000);
  if (!rl.ok)
    return apiError("RATE-001", 429, {
      message: "ดำเนินการบ่อยเกินไป กรุณาลองใหม่ภายหลัง",
      headers: { "Retry-After": String(rl.retryAfter) },
    });

  const result = await requestVerification(userId);
  if (!result.success)
    return apiError("VAL-001", 400, { message: result.error });

  await notifyAdmins({
    type: "VERIFY_REQUEST",
    title: "คำขอยืนยันตัวตนใหม่",
    body: `${username} ขอยืนยันตัวตน (จ่าย ${VERIFY_FEE_COINS} เหรียญ)`,
    link: "/admin/verifications",
  });

  return NextResponse.json({ ok: true });
}
