import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { action, adminNote } = body as { action: "approve" | "reject"; adminNote?: string };

  const application = await prisma.translatorApplication.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "approve") {
    // Atomic: update application + promote user + create Translator profile
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
        create: { userId: application.userId, penName: application.penName, bio: "" },
        update: { penName: application.penName },
      }),
    ]);
    return NextResponse.json({ success: true, action: "approved" });
  }

  if (action === "reject") {
    await prisma.translatorApplication.update({
      where: { id },
      data: { status: "REJECTED", adminNote: adminNote?.trim() || "ไม่ผ่านการพิจารณา" },
    });
    return NextResponse.json({ success: true, action: "rejected" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
