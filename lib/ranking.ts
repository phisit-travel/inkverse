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

  const mangas = await prisma.manga.findMany({
    select: {
      id: true,
      totalViews: true,
      _count: { select: { bookmarks: true, ratings: true } },
    },
  });

  const scored = mangas
    .map((m) => ({
      mangaId: m.id,
      views: m.totalViews,
      bookmarks: m._count.bookmarks,
      likes: m._count.ratings,
      score: m.totalViews * 1 + m._count.bookmarks * 5 + m._count.ratings * 3,
    }))
    .sort((a, b) => b.score - a.score);

  for (let i = 0; i < scored.length; i++) {
    const { mangaId, views, bookmarks, likes } = scored[i];
    await prisma.weeklyStats.upsert({
      where: { mangaId_period: { mangaId, period } },
      create: { mangaId, period, views, bookmarks, likes, rank: i + 1, calculatedAt: now },
      update: { views, bookmarks, likes, rank: i + 1, calculatedAt: now },
    });
  }
}
