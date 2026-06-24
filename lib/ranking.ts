import { prisma } from "@/lib/prisma";
import { listedMangaWhere } from "@/lib/chapters";

type StatPeriod = "WEEK" | "MONTH" | "ALL";

export async function getRanking(period: StatPeriod, limit = 10, hideAdult = false) {
  return prisma.weeklyStats.findMany({
    // Guard at read-time too: a work unpublished since the last recalc must drop
    // out of the ranking panel immediately, not wait for the next recalc.
    // hideAdult drops 18+ works from the panel in the app (Play Store).
    where: {
      period,
      manga: { ...listedMangaWhere(), ...(hideAdult ? { contentRating: { not: "ADULT" as const } } : {}) },
    },
    orderBy: { rank: "asc" },
    take: limit,
    include: {
      manga: {
        select: {
          id: true,
          title: true,
          slug: true,
          coverUrl: true,
          type: true,
          status: true,
        },
      },
    },
  });
}

export async function recalculateRanking(period: StatPeriod) {
  const now = new Date();

  // Read from the denormalized stat columns on Manga (bookmarkCount/ratingCount)
  // instead of running a _count subquery per row.
  const mangas = await prisma.manga.findMany({
    // Don't rank story-level-unpublished works.
    where: { ...listedMangaWhere() },
    select: {
      id: true,
      totalViews: true,
      bookmarkCount: true,
      ratingCount: true,
    },
  });

  const scored = mangas
    .map((m) => ({
      mangaId: m.id,
      views: m.totalViews,
      bookmarks: m.bookmarkCount,
      likes: m.ratingCount,
      score: m.totalViews * 1 + m.bookmarkCount * 5 + m.ratingCount * 3,
    }))
    .sort((a, b) => b.score - a.score);

  // Batch all writes into one round-trip: clear this period's rows then
  // re-insert them in a single createMany (same scores/ranks as before).
  await prisma.$transaction([
    prisma.weeklyStats.deleteMany({ where: { period } }),
    prisma.weeklyStats.createMany({
      data: scored.map((s, i) => ({
        mangaId: s.mangaId,
        period,
        views: s.views,
        bookmarks: s.bookmarks,
        likes: s.likes,
        rank: i + 1,
        calculatedAt: now,
      })),
    }),
  ]);
}
