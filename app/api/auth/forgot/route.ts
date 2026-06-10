import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendEmail, passwordResetEmail } from "@/lib/email";

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
    select: { id: true, passwordHash: true },
  });
  // Only credentials accounts (have a password) can reset.
  if (!user || !user.passwordHash) return ok;

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expires: new Date(Date.now() + 60 * 60_000) },
  });

  const base = process.env.SITE_URL || process.env.NEXTAUTH_URL || "";
  await sendEmail({
    to: email,
    subject: "รีเซ็ตรหัสผ่าน INKVERSE",
    html: passwordResetEmail(`${base}/auth/reset?token=${token}`),
  });

  return ok;
}
