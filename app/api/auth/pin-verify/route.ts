import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";
import { markPinVerified } from "@/lib/deviceSessions";
import { apiError } from "@/lib/apiError";

// Verify the login PIN for the current (pin-pending) session. On success the
// session row is marked pin-verified; the client then calls useSession().update()
// so the JWT callback clears `pinPending` and the middleware lets them through.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return apiError("AUTH-007", 401);
  const userId = (session.user as { id: string }).id;
  const sid = (session.user as { sid?: string }).sid;

  // Throttle PIN guesses (brute-force protection) — lock after a few tries.
  const rl = rateLimit(`pinverify:${userId}`, 6, 10 * 60_000);
  if (!rl.ok)
    return apiError("RATE-001", 429, {
      message: "ใส่ PIN ผิดหลายครั้ง กรุณารอสักครู่แล้วลองใหม่",
      headers: { "Retry-After": String(rl.retryAfter) },
    });

  const body = (await req.json().catch(() => ({}))) as { pin?: string };
  const pin = (body.pin || "").trim();
  if (!/^\d{6}$/.test(pin)) return apiError("VAL-001", 400, { message: "PIN ต้องเป็นตัวเลข 6 หลัก" });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pinHash: true } });
  if (!user?.pinHash) return NextResponse.json({ ok: true }); // no PIN set → nothing to gate

  const ok = await bcrypt.compare(pin, user.pinHash);
  if (!ok) return apiError("AUTH-002", 400, { message: "PIN ไม่ถูกต้อง" });

  if (sid) await markPinVerified(sid);
  return NextResponse.json({ ok: true });
}
