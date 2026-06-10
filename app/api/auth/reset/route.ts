import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(10),
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

  const row = await prisma.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
    select: { id: true, userId: true, used: true, expires: true },
  });
  if (!row || row.used || row.expires < new Date())
    return NextResponse.json({ error: "ลิงก์ไม่ถูกต้องหรือหมดอายุ กรุณาขอใหม่" }, { status: 400 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { used: true } }),
    // Invalidate any other outstanding reset tokens for this user.
    prisma.passwordResetToken.updateMany({
      where: { userId: row.userId, used: false },
      data: { used: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
