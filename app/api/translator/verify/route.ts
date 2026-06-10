import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { requestVerification, VERIFY_FEE_COINS } from "@/lib/coins";
import { notifyAdmins } from "@/lib/notifications";

export async function POST() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string; username?: string }).id;
  const username = (session.user as { username?: string }).username ?? "นักแปล";

  const rl = rateLimit(`verify-req:${userId}`, 3, 60 * 60_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "ดำเนินการบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );

  const result = await requestVerification(userId);
  if (!result.success)
    return NextResponse.json({ error: result.error }, { status: 400 });

  await notifyAdmins({
    type: "VERIFY_REQUEST",
    title: "คำขอยืนยันตัวตนใหม่",
    body: `${username} ขอยืนยันตัวตน (จ่าย ${VERIFY_FEE_COINS} เหรียญ)`,
    link: "/admin/verifications",
  });

  return NextResponse.json({ ok: true });
}
