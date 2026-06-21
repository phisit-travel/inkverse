import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Per-user reading progress:
//  - items: in-progress manga (not finished) with the chapter to resume + %,
//           most recently read first → powers the "อ่านต่อ" row.
//  - bySlug: { slug: percent } for EVERY manga with reads → powers the
//           "อ่านแล้ว X%" badge on manga cards.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ items: [], bySlug: {} });

  const userId = (session.user as { id: string }).id;
  const reads = await prisma.readHistory.findMany({
    where: { userId },
    orderBy: { readAt: "desc" },
    select: {
      chapter: {
        select: {
          chapterNum: true,
          mangaId: true,
          // published is read so a story-level-unpublished work drops out of the
          // "อ่านต่อ" row + progress badges (its page would 404 anyway).
          manga: { select: { slug: true, title: true, coverUrl: true, published: true } },
        },
      },
    },
  });

  // Tally reads per manga; first row seen (desc order) = most recent chapter.
  const perManga = new Map<
    string,
    { count: number; slug: string; title: string; coverUrl: string | null; lastChapterNum: number }
  >();
  for (const r of reads) {
    const c = r.chapter;
    if (!c.manga.published) continue; // hide story-level-unpublished works
    const e = perManga.get(c.mangaId);
    if (e) e.count++;
    else
      perManga.set(c.mangaId, {
        count: 1,
        slug: c.manga.slug,
        title: c.manga.title,
        coverUrl: c.manga.coverUrl,
        lastChapterNum: c.chapterNum,
      });
  }

  const mangaIds = [...perManga.keys()];
  const totals = mangaIds.length
    ? await prisma.chapter.groupBy({
        by: ["mangaId"],
        where: { mangaId: { in: mangaIds } },
        _count: { _all: true },
      })
    : [];
  const totalMap = new Map(totals.map((t) => [t.mangaId, t._count._all]));

  const bySlug: Record<string, number> = {};
  const items: {
    slug: string;
    title: string;
    coverUrl: string | null;
    chapterNum: number;
    percent: number;
  }[] = [];
  for (const [mid, e] of perManga) {
    const total = totalMap.get(mid) ?? 0;
    const percent = total > 0 ? Math.round((e.count / total) * 100) : 0;
    bySlug[e.slug] = percent;
    if (percent < 100 && items.length < 12) {
      items.push({
        slug: e.slug,
        title: e.title,
        coverUrl: e.coverUrl,
        chapterNum: e.lastChapterNum,
        percent,
      });
    }
  }

  return NextResponse.json({ items, bySlug });
}
