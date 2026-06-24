import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";

// Save (or refresh) a browser's Web Push subscription for the signed-in user.
// Body is the PushSubscription JSON from the browser (endpoint + keys).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return apiError("AUTH-007", 401);
  const userId = (session.user as { id: string }).id;

  const body = (await req.json().catch(() => ({}))) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  const endpoint = body.endpoint;
  const p256dh = body.keys?.p256dh;
  const authKey = body.keys?.auth;
  if (!endpoint || !p256dh || !authKey)
    return apiError("VAL-001", 400, { message: "ข้อมูลการสมัครรับแจ้งเตือนไม่ครบ" });

  // Upsert by endpoint: re-subscribing, or a different account on the same
  // browser, just re-points the existing row to the current user.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh, auth: authKey },
    update: { userId, p256dh, auth: authKey },
  });
  return NextResponse.json({ ok: true });
}

// Remove this browser's subscription (user turned notifications off).
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return apiError("AUTH-007", 401);
  const userId = (session.user as { id: string }).id;
  const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (body.endpoint)
    await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId } });
  return NextResponse.json({ ok: true });
}
