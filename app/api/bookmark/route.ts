import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { mangaId } = await req.json();

  if (!mangaId) {
    return NextResponse.json({ error: "mangaId required" }, { status: 400 });
  }

  await prisma.bookmark.upsert({
    where: { userId_mangaId: { userId, mangaId } },
    create: { userId, mangaId },
    update: {},
  });

  return NextResponse.json({ bookmarked: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { mangaId } = await req.json();

  await prisma.bookmark.deleteMany({ where: { userId, mangaId } });

  return NextResponse.json({ bookmarked: false });
}
