import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";
import { apiError } from "@/lib/apiError";

const PIN_RE = /^\d{6}$/;

// Set or change the account's 6-digit login PIN (a 2nd factor that gates EVERY
// login method, including Google). To change an existing PIN you must supply the
// current one; to set the first PIN, password accounts confirm with the password
// (Google-only accounts are already authenticated via the session).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return apiError("AUTH-007", 401);
  const userId = (session.user as { id: string }).id;
  if (!rateLimit(`pinset:${userId}`, 6, 10 * 60_000).ok)
    return apiError("RATE-001", 429, { message: "ดำเนินการบ่อยเกินไป ลองใหม่ภายหลัง" });

  const body = (await req.json().catch(() => ({}))) as { pin?: string; currentPin?: string; currentPassword?: string };
  const pin = (body.pin || "").trim();
  if (!PIN_RE.test(pin)) return apiError("VAL-001", 400, { message: "PIN ต้องเป็นตัวเลข 6 หลัก" });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, pinHash: true } });
  if (!user) return apiError("VAL-002", 404);

  if (user.pinHash) {
    // Changing an existing PIN → must know the current one.
    const ok = body.currentPin ? await bcrypt.compare(body.currentPin, user.pinHash) : false;
    if (!ok) return apiError("AUTH-002", 400, { message: "PIN ปัจจุบันไม่ถูกต้อง" });
  } else if (user.passwordHash) {
    // First PIN on a password account → confirm with the password.
    const ok = body.currentPassword ? await bcrypt.compare(body.currentPassword, user.passwordHash) : false;
    if (!ok) return apiError("AUTH-002", 400, { message: "รหัสผ่านไม่ถูกต้อง" });
  }
  // else: Google-only account, first PIN — the active session is the proof.

  await prisma.user.update({ where: { id: userId }, data: { pinHash: await bcrypt.hash(pin, 10) } });
  return NextResponse.json({ ok: true });
}

// Remove the PIN (turn the gate off). Confirm with the current PIN, or the
// password for password accounts.
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return apiError("AUTH-007", 401);
  const userId = (session.user as { id: string }).id;

  const body = (await req.json().catch(() => ({}))) as { currentPin?: string; currentPassword?: string };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, pinHash: true } });
  if (!user?.pinHash) return apiError("VAL-003", 409, { message: "ยังไม่ได้ตั้ง PIN" });

  const okPin = body.currentPin ? await bcrypt.compare(body.currentPin, user.pinHash) : false;
  const okPw = body.currentPassword && user.passwordHash ? await bcrypt.compare(body.currentPassword, user.passwordHash) : false;
  if (!okPin && !okPw) return apiError("AUTH-002", 400, { message: "PIN หรือรหัสผ่านไม่ถูกต้อง" });

  await prisma.user.update({ where: { id: userId }, data: { pinHash: null } });
  return NextResponse.json({ ok: true });
}
