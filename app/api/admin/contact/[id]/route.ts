import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, contactReplyEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { sendPushToUsers } from "@/lib/push";
import { apiError } from "@/lib/apiError";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN")
    return apiError("AUTH-008", 403);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  // Reply: email the original sender, store the reply, mark resolved.
  if (typeof body?.reply === "string" && body.reply.trim()) {
    const reply = body.reply.trim().slice(0, 5000);
    const msg = await prisma.contactMessage.findUnique({ where: { id } });
    if (!msg) return apiError("VAL-002", 404, { message: "ไม่พบข้อความ" });

    const emailed = await sendEmail({
      to: msg.email,
      subject: `ตอบกลับ: ${msg.subject || "ข้อความถึงทีมงาน INKVERSE"}`,
      html: contactReplyEmail({ name: msg.name, original: msg.message, reply }),
    });

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { reply, repliedAt: new Date(), status: "RESOLVED" },
    });

    // Notify the sender on-site (bell) + push, if they have an account.
    if (msg.userId) {
      const snippet = reply.length > 140 ? reply.slice(0, 140) + "…" : reply;
      await createNotification({
        userId: msg.userId,
        type: "CONTACT_REPLY",
        title: "ทีมงานตอบกลับข้อความของคุณแล้ว",
        body: snippet,
        link: "/contact",
      });
      await sendPushToUsers([msg.userId], "ทีมงานตอบกลับแล้ว", snippet, "/contact");
    }

    return NextResponse.json({ ...updated, emailed });
  }

  // Otherwise: just toggle the status.
  const status = body?.status === "RESOLVED" ? "RESOLVED" : "OPEN";
  try {
    const msg = await prisma.contactMessage.update({ where: { id }, data: { status } });
    return NextResponse.json(msg);
  } catch {
    return apiError("VAL-002", 404, { message: "ไม่พบข้อความ" });
  }
}
