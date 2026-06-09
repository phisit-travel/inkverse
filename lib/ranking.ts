import { prisma } from "@/lib/prisma";

type StatPeriod = "WEEK" | "MONTH" | "ALL";

let redis: import("ioredis").Redis | null = null;

async function getRedis() {
  if (!redis && process.env.REDIS_URL) {
    try {
      const { default: Redis } = await import("ioredis");
      redis = new Redis(process.env.REDIS_URL, {
        connectTimeout: 2000,
        commandTimeout: 1000,
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false,
        lazyConnect: false,
        retryStrategy: () => null,
      });
      redis.on("error", () => { redis = null; });
    } catch {
      redis = null;
    }
  }
  return redis;
}

const CACHE_TTL = 30 * 60;

export async function getRanking(period: StatPeriod, limit = 10) {
  const cacheKey = `ranking:${period}:${limit}`;
  const r = await getRedis();

  if (r) {
    try {
      const cached = await r.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}
  }

  const stats = await prisma.weeklyStats.findMany({
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

  if (r) {
    try {
      await r.setex(cacheKey, CACHE_TTL, JSON.stringify(stats));
    } catch {}
  }

  return stats;
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

  const r = await getRedis();
  if (r) {
    try {
      await r.del(`ranking:${period}:10`);
    } catch {}
  }
}
