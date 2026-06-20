import { prisma } from "@/lib/prisma";

type StatPeriod = "WEEK" | "MONTH" | "ALL";

export async function getRanking(period: StatPeriod, limit = 10) {
  return prisma.weeklyStats.findMany({
    where: { period },
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
