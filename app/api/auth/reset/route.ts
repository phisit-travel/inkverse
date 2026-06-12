import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, "รหัส OTP ต้องเป็นตัวเลข 6 หลัก"),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const rl = rateLimit(`reset:${clientIp(req)}`, 10, 15 * 60_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "ลองบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง (รหัสผ่านอย่างน้อย 8 ตัว)" }, { status: 400 });

  const email = parsed.data.email.toLowerCase();

  // Throttle OTP guesses per account — 6-digit codes need brute-force protection.
  if (!rateLimit(`resetotp:${email}`, 8, 15 * 60_000).ok)
    return NextResponse.json({ error: "ลองบ่อยเกินไป กรุณาขอรหัสใหม่" }, { status: 429 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const invalid = NextResponse.json(
    { error: "รหัส OTP ไม่ถูกต้องหรือหมดอายุ กรุณาขอใหม่" },
    { status: 400 }
  );
  if (!user) return invalid;

  const row = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, token: parsed.data.otp, used: false, expires: { gt: new Date() } },
    select: { id: true },
  });
  if (!row) return invalid;

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    // Burn this code and every other outstanding one for the account.
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
