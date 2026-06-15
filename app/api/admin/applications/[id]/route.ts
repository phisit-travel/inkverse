import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { apiError } from "@/lib/apiError";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return apiError("AUTH-008", 403);
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { action, adminNote } = body as { action: "approve" | "reject"; adminNote?: string };

  const application = await prisma.translatorApplication.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!application) return apiError("VAL-002", 404, { message: "ไม่พบใบสมัคร" });

  if (action === "approve") {
    await prisma.$transaction([
      prisma.translatorApplication.update({
        where: { id },
        data: { status: "APPROVED" },
      }),
      prisma.user.update({
        where: { id: application.userId },
        data: { role: "TRANSLATOR" },
      }),
      prisma.translator.upsert({
        where: { userId: application.userId },
        create: { userId: application.userId, penName: application.penName, bio: "", kind: application.kind },
        update: { penName: application.penName, kind: application.kind },
      }),
    ]);

    await createNotification({
      userId: application.userId,
      type: "APPLICATION_APPROVED",
      title: "ยินดีด้วย! ใบสมัครครีเอเตอร์ได้รับการอนุมัติ",
      body: `ใบสมัครในนาม "${application.penName}" ได้รับการอนุมัติแล้ว เข้าแดชบอร์ดเพื่อเริ่มลงผลงาน (แปลมังงะ / เขียนนิยาย) ได้ทันที`,
      link: "/dashboard",
    });

    return NextResponse.json({ success: true, action: "approved" });
  }

  if (action === "reject") {
    const note = adminNote?.trim() || "ไม่ผ่านการพิจารณา";
    await prisma.translatorApplication.update({
      where: { id },
      data: { status: "REJECTED", adminNote: note },
    });

    await createNotification({
      userId: application.userId,
      type: "APPLICATION_REJECTED",
      title: "ใบสมัครไม่ผ่านการพิจารณา",
      body: note,
      link: "/apply",
    });

    return NextResponse.json({ success: true, action: "rejected" });
  }

  return apiError("VAL-001", 400, { message: "คำสั่งไม่ถูกต้อง" });
}
