import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasUnlockedChapter } from "@/lib/coins";
import { signedImagePath } from "@/lib/imageToken";
import { renderNovel, novelStats } from "@/lib/markdown";
import { isChapterLive } from "@/lib/chapters";
import { apiError } from "@/lib/apiError";

// Returns a chapter's content for offline download (signed page URLs for manga,
// HTML for novels) — gated by the same access rules as the reader so locked
// premium chapters can't be bulk-saved without unlocking.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user ? (session.user as { id: string }).id : null;

  const chapter = await prisma.chapter.findUnique({
    where: { id },
    select: {
      id: true,
      chapterNum: true,
      title: true,
      isPremium: true,
      freeAt: true,
      status: true,
      publishAt: true,
      content: true,
      authorNote: true,
      pages: { orderBy: { pageNum: "asc" }, select: { id: true, width: true, height: true } },
      manga: { select: { type: true, title: true, slug: true, coverUrl: true, translator: { select: { userId: true } } } },
    },
  });
  if (!chapter) return apiError("READ-001", 404);

  const isOwner = !!userId && chapter.manga.translator?.userId === userId;

  if (!isChapterLive(chapter) && !isOwner) {
    return apiError("READ-003", 403);
  }

  const stillPaid = chapter.isPremium && (!chapter.freeAt || chapter.freeAt.getTime() > Date.now());
  if (stillPaid && !isOwner) {
    if (!userId || !(await hasUnlockedChapter(userId, chapter.id))) {
      return apiError("READ-002", 403);
    }
  }

  const base = {
    chapterId: chapter.id,
    mangaSlug: chapter.manga.slug,
    chapterNum: chapter.chapterNum,
    mangaTitle: chapter.manga.title,
    coverUrl: chapter.manga.coverUrl,
  };

  if (chapter.manga.type === "NOVEL") {
    return NextResponse.json({
      ...base,
      type: "novel",
      html: renderNovel(chapter.content),
      chapterTitle: chapter.title,
      minutes: novelStats(chapter.content).minutes,
      authorNote: chapter.authorNote,
    });
  }

  return NextResponse.json({
    ...base,
    type: "manga",
    pages: chapter.pages.map((p) => ({
      src: signedImagePath(p.id, userId),
      width: p.width,
      height: p.height,
    })),
  });
}
