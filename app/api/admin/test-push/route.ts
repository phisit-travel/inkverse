import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";
import { sendWebPushToUsers } from "@/lib/webpush";

// Admin-only: fire a test notification to the admin's OWN devices (web push +
// FCM) so push can be verified without publishing a real chapter. Returns how
// many subscriptions/tokens it targeted (0 = this device hasn't opted in yet).
export async function POST() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    return apiError("AUTH-007", 401);
  const userId = (session.user as { id: string }).id;

  const [webCount, fcmCount] = await Promise.all([
    prisma.pushSubscription.count({ where: { userId } }),
    prisma.pushToken.count({ where: { userId } }),
  ]);

  const title = "ทดสอบแจ้งเตือน 🔔";
  const body = "ถ้าเห็นข้อความนี้ = ระบบแจ้งเตือนใช้งานได้แล้ว!";
  await sendWebPushToUsers([userId], title, body, "/");
  // FCM too (no-op unless Firebase is configured).
  try {
    const { sendPushToUsers } = await import("@/lib/push");
    await sendPushToUsers([userId], title, body, "/");
  } catch {
    /* optional */
  }

  return NextResponse.json({ ok: true, web: webCount, fcm: fcmCount });
}
