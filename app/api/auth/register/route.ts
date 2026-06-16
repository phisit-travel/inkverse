import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import crypto from "crypto";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendEmail, verificationEmail } from "@/lib/email";
import { verifyTurnstile } from "@/lib/turnstile";
import { apiError } from "@/lib/apiError";

const BASE_URL = process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://inksverse.com";

const schema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "ใช้ได้เฉพาะตัวอักษร ตัวเลข และ _"),
  email: z.string().email(),
  password: z.string().min(8),
  turnstileToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const rl = rateLimit(`register:${clientIp(req)}`, 5, 10 * 60_000);
  if (!rl.ok)
    return apiError("RATE-001", 429, {
      message: "พยายามสมัครบ่อยเกินไป กรุณาลองใหม่ภายหลัง",
      headers: { "Retry-After": String(rl.retryAfter) },
    });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    if (f.username)
      return apiError("AUTH-004", 400, { message: "ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9 และ _ ความยาว 3–30 ตัว" });
    if (f.email) return apiError("VAL-001", 400, { message: "อีเมลไม่ถูกต้อง" });
    if (f.password) return apiError("VAL-001", 400, { message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
    return apiError("VAL-001", 400);
  }

  const { username, email, password, turnstileToken } = parsed.data;

  // Bot check ("I am human"). No-op until TURNSTILE_SECRET_KEY is configured.
  // Skipped for the app shell — the Turnstile widget can't render in the
  // WebView, and email verification still gates the welcome bonus, so bot
  // signups gain nothing. The IP rate-limit above still applies to everyone.
  const isApp = req.headers.get("x-inkverse-app") === "1";
  if (!isApp && !(await verifyTurnstile(turnstileToken, clientIp(req)))) {
    return apiError("AUTH-001", 400, { message: "กรุณายืนยันว่าคุณไม่ใช่บอท" });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    return existing.email === email ? apiError("AUTH-003", 409) : apiError("AUTH-004", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { username, email, passwordHash, role: "READER" },
    select: { id: true, username: true, email: true, role: true },
  });

  // A verified email is required before password login (stops pre-account
  // hijacking). New accounts must click the link before they can sign in.
  const vToken = crypto.randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: { token: vToken, userId: user.id, expires: new Date(Date.now() + 24 * 60 * 60_000) },
  });
  const sent = await sendEmail({
    to: email,
    subject: "ยืนยันอีเมล — INKVERSE",
    html: verificationEmail(`${BASE_URL}/api/auth/verify?token=${vToken}`),
  });
  if (!sent) {
    // Email isn't configured → can't verify; mark verified so the account isn't
    // locked out of password login.
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  }

  return NextResponse.json({ ...user, needsVerification: sent }, { status: 201 });
}
