import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isChapterLive, liveChapterWhere } from "@/lib/chapters";
import { decodeSlug } from "@/lib/slug";
import { apiError } from "@/lib/apiError";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; chapter: string }> }
) {
  const { slug: rawSlug, chapter } = await params;
  const slug = decodeSlug(rawSlug);
  const chapterNum = parseFloat(chapter);

  const manga = await prisma.manga.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!manga) {
    return apiError("READ-004", 404);
  }

  const chapterData = await prisma.chapter.findUnique({
    where: { mangaId_chapterNum: { mangaId: manga.id, chapterNum } },
    include: { pages: { orderBy: { pageNum: "asc" } } },
  });

  if (!chapterData || !isChapterLive(chapterData)) {
    return apiError("READ-001", 404);
  }

  const [prev, next] = await Promise.all([
    prisma.chapter.findFirst({
      where: { mangaId: manga.id, chapterNum: { lt: chapterNum }, ...liveChapterWhere() },
      orderBy: { chapterNum: "desc" },
      select: { chapterNum: true },
    }),
    prisma.chapter.findFirst({
      where: { mangaId: manga.id, chapterNum: { gt: chapterNum }, ...liveChapterWhere() },
      orderBy: { chapterNum: "asc" },
      select: { chapterNum: true },
    }),
  ]);

  return NextResponse.json({
    ...chapterData,
    prevChapter: prev?.chapterNum ?? null,
    nextChapter: next?.chapterNum ?? null,
  });
}
