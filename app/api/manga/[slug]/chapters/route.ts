import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyNewChapter } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "TRANSLATOR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  const manga = await prisma.manga.findUnique({ where: { slug } });
  if (!manga) {
    return NextResponse.json({ error: "Manga not found" }, { status: 404 });
  }

  if (role === "TRANSLATOR") {
    const userId = (session.user as { id: string }).id;
    const translator = await prisma.translator.findUnique({ where: { userId } });
    if (!translator || manga.translatorId !== translator.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const { chapterNum, title, isPremium = false, coinCost = 0 } = body;

  if (typeof chapterNum !== "number" || isNaN(chapterNum)) {
    return NextResponse.json({ error: "Valid chapterNum required" }, { status: 400 });
  }

  const existing = await prisma.chapter.findUnique({
    where: { mangaId_chapterNum: { mangaId: manga.id, chapterNum } },
  });
  if (existing) {
    return NextResponse.json({ error: "Chapter number already exists" }, { status: 409 });
  }

  const chapter = await prisma.chapter.create({
    data: {
      mangaId: manga.id,
      chapterNum,
      title: title || null,
      isPremium,
      coinCost: isPremium ? coinCost : 0,
    },
  });

  await prisma.manga.update({
    where: { id: manga.id },
    data: { updatedAt: new Date() },
  });

  // Re-engagement: tell everyone who bookmarked this manga (best-effort).
  await notifyNewChapter({
    mangaId: manga.id,
    mangaTitle: manga.title,
    mangaSlug: manga.slug,
    chapterNum,
  });

  return NextResponse.json(chapter, { status: 201 });
}
