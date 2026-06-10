import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body?.status === "RESOLVED" ? "RESOLVED" : "OPEN";

  try {
    const msg = await prisma.contactMessage.update({ where: { id }, data: { status } });
    return NextResponse.json(msg);
  } catch {
    return NextResponse.json({ error: "ไม่พบข้อความ" }, { status: 404 });
  }
}
