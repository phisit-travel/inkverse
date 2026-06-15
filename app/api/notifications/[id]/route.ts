import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("AUTH-007", 401);

  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("AUTH-007", 401);

  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  await prisma.notification.deleteMany({ where: { id, userId } });

  return NextResponse.json({ ok: true });
}
