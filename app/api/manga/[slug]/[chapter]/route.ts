import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isChapterLive, liveChapterWhere } from "@/lib/chapters";
import { hasUnlockedChapter } from "@/lib/coins";
import { signedImagePath } from "@/lib/imageToken";
import { renderNovel } from "@/lib/markdown";
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
    select: { id: true, translator: { select: { userId: true } } },
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

  // ── Access control — mirror the reader page so this API can't be used to
  // bypass the premium gate and exfiltrate paid content. ──────────────────
  const session = await auth();
  const userId = session?.user ? (session.user as { id: string }).id : null;
  const isOwner = !!userId && manga.translator?.userId === userId;
  const stillPaid =
    chapterData.isPremium && (!chapterData.freeAt || chapterData.freeAt.getTime() > Date.now());
  const locked =
    stillPaid && !isOwner && !(userId && (await hasUnlockedChapter(userId, chapterData.id)));

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

  const { content, pages, ...meta } = chapterData;
  const prevChapter = prev?.chapterNum ?? null;
  const nextChapter = next?.chapterNum ?? null;

  // Locked: return metadata only — never the novel HTML or page images.
  if (locked) {
    return NextResponse.json({ ...meta, locked: true, content: null, pages: [], prevChapter, nextChapter });
  }

  // Unlocked: serve sanitized content + signed page paths (never raw R2 keys).
  return NextResponse.json({
    ...meta,
    locked: false,
    content: content ? renderNovel(content) : null,
    pages: pages.map((p) => ({
      id: p.id,
      pageNum: p.pageNum,
      width: p.width,
      height: p.height,
      src: signedImagePath(p.id, userId),
    })),
    prevChapter,
    nextChapter,
  });
}
