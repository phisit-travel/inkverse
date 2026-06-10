import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { notifyAdmins } from "@/lib/notifications";

const schema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  subject: z.string().max(120).optional(),
  message: z.string().min(5).max(4000),
});

export async function POST(req: NextRequest) {
  // Throttle abuse — by IP, and tighter per-user if signed in.
  const rl = rateLimit(`contact:${clientIp(req)}`, 5, 10 * 60_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "ส่งข้อความบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });

  const session = await auth();
  const userId = session?.user ? (session.user as { id: string }).id : null;

  const msg = await prisma.contactMessage.create({
    data: { ...parsed.data, userId },
  });

  await notifyAdmins({
    type: "CONTACT_MESSAGE",
    title: "ข้อความติดต่อใหม่",
    body: `${parsed.data.name}: ${parsed.data.subject || parsed.data.message.slice(0, 60)}`,
    link: "/admin/contact",
  });

  return NextResponse.json({ ok: true, id: msg.id }, { status: 201 });
}
