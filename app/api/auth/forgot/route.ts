import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendEmail, passwordResetOtpEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const rl = rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "ขอบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );

  const parsed = schema.safeParse(await req.json().catch(() => null));
  // Always return the same response — never reveal whether an email exists.
  const ok = NextResponse.json({ ok: true });
  if (!parsed.success) return ok;

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  // Any real account may request an OTP — including Google-only accounts that
  // have no password yet, so they can SET one and log into the app (where Google
  // sign-in isn't available). Email ownership is proven by the OTP itself.
  if (!user) return ok;

  // Replace any previous OTP for this user, then issue a fresh 6-digit code.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  const expires = new Date(Date.now() + 10 * 60_000); // 10 minutes
  // token is globally unique → retry on the (extremely rare) cross-user clash.
  for (let i = 0; i < 5; i++) {
    const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    try {
      await prisma.passwordResetToken.create({
        data: { token: otp, userId: user.id, expires },
      });
      await sendEmail({
        to: email,
        subject: "รหัส OTP รีเซ็ตรหัสผ่าน INKVERSE",
        html: passwordResetOtpEmail(otp),
      });
      break;
    } catch {
      if (i === 4) break; // give up silently — response stays generic
    }
  }

  return ok;
}
