import { prisma } from "./prisma";
import { createNotification } from "./notifications";

/**
 * Achievement system. Definitions live here in code (not the DB); the
 * `UserAchievement` table only records which keys a user has earned. Unlocking
 * grants a badge + a notification ONLY — no coin reward (avoids coin inflation).
 * A retention loop that nudges readers to read more, finish series, and engage.
 */

export type AchievementCategory = "reading" | "completion" | "social" | "engagement";

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string; // lucide icon name, mapped to a component in the UI
  category: AchievementCategory;
  metric: keyof Stats;
  threshold: number;
}

export interface Stats {
  chaptersRead: number;
  mangaCompleted: number;
  genresRead: number;
  bookmarks: number;
  ratings: number;
  premiumUnlocked: number;
  topups: number;
  comments: number;
  coinsSpent: number;
}

export const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  reading: "การอ่าน",
  completion: "อ่านจบเรื่อง",
  social: "รีวิว & สังคม",
  engagement: "สนับสนุน & มีส่วนร่วม",
};

// Thresholds are deliberately demanding — achievements are long-term challenges,
// not participation trophies. Badge + notification only; no coin reward.
export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Reading volume ──
  { key: "read-10",    title: "นักอ่านหน้าใหม่",     description: "อ่านครบ 10 ตอน",          icon: "BookOpen",     category: "reading",    metric: "chaptersRead",    threshold: 10 },
  { key: "read-100",   title: "หนอนหนังสือ",         description: "อ่านครบ 100 ตอน",         icon: "BookText",     category: "reading",    metric: "chaptersRead",    threshold: 100 },
  { key: "read-300",   title: "นักอ่านตัวยง",        description: "อ่านครบ 300 ตอน",         icon: "Library",      category: "reading",    metric: "chaptersRead",    threshold: 300 },
  { key: "read-1000",  title: "เซียนนักอ่าน",        description: "อ่านครบ 1,000 ตอน",       icon: "Flame",        category: "reading",    metric: "chaptersRead",    threshold: 1000 },
  { key: "read-3000",  title: "ปรมาจารย์การอ่าน",    description: "อ่านครบ 3,000 ตอน",       icon: "Crown",        category: "reading",    metric: "chaptersRead",    threshold: 3000 },
  { key: "read-8000",  title: "ตำนานนักอ่าน",        description: "อ่านครบ 8,000 ตอน",       icon: "Sparkles",     category: "reading",    metric: "chaptersRead",    threshold: 8000 },

  // ── Completion ──
  { key: "complete-3",   title: "จบเรื่องแรกๆ",       description: "อ่านจบ 3 เรื่อง",          icon: "CheckCircle2", category: "completion", metric: "mangaCompleted",  threshold: 3 },
  { key: "complete-10",  title: "นักสะสมเรื่องจบ",     description: "อ่านจบ 10 เรื่อง",         icon: "CheckCircle2", category: "completion", metric: "mangaCompleted",  threshold: 10 },
  { key: "complete-30",  title: "ปิดเล่มมือโปร",       description: "อ่านจบ 30 เรื่อง",         icon: "Trophy",       category: "completion", metric: "mangaCompleted",  threshold: 30 },
  { key: "complete-75",  title: "นักล่าเรื่องจบ",      description: "อ่านจบ 75 เรื่อง",         icon: "Trophy",       category: "completion", metric: "mangaCompleted",  threshold: 75 },
  { key: "complete-150", title: "จอมสะสมตำนาน",       description: "อ่านจบ 150 เรื่อง",        icon: "Crown",        category: "completion", metric: "mangaCompleted",  threshold: 150 },

  // ── Premium unlock (supporting creators) ──
  { key: "unlock-10",   title: "ผู้สนับสนุนหน้าใหม่",  description: "ปลดล็อกตอนพรีเมียม 10 ตอน", icon: "Unlock",     category: "engagement", metric: "premiumUnlocked", threshold: 10 },
  { key: "unlock-50",   title: "ผู้สนับสนุนตัวจริง",   description: "ปลดล็อก 50 ตอน",          icon: "Unlock",       category: "engagement", metric: "premiumUnlocked", threshold: 50 },
  { key: "unlock-200",  title: "ผู้อุปถัมภ์",          description: "ปลดล็อก 200 ตอน",         icon: "Unlock",       category: "engagement", metric: "premiumUnlocked", threshold: 200 },
  { key: "unlock-600",  title: "เสาหลักของนักเขียน",   description: "ปลดล็อก 600 ตอน",         icon: "Gem",          category: "engagement", metric: "premiumUnlocked", threshold: 600 },
  { key: "unlock-1500", title: "มหาเศรษฐีนักปลดล็อก",  description: "ปลดล็อก 1,500 ตอน",       icon: "Crown",        category: "engagement", metric: "premiumUnlocked", threshold: 1500 },

  // ── Coins spent ──
  { key: "spent-1000",  title: "ใช้จ่ายมีสไตล์",      description: "ใช้เหรียญรวม 1,000",      icon: "Coins",        category: "engagement", metric: "coinsSpent",      threshold: 1000 },
  { key: "spent-5000",  title: "นักลงทุนตัวยง",       description: "ใช้เหรียญรวม 5,000",      icon: "Coins",        category: "engagement", metric: "coinsSpent",      threshold: 5000 },
  { key: "spent-20000", title: "เจ้าบุญทุ่ม",         description: "ใช้เหรียญรวม 20,000",     icon: "Gem",          category: "engagement", metric: "coinsSpent",      threshold: 20000 },

  // ── Top-ups ──
  { key: "topup-1",   title: "ผู้สนับสนุน",           description: "เติมเหรียญครั้งแรก",        icon: "Coins",        category: "engagement", metric: "topups",          threshold: 1 },
  { key: "topup-10",  title: "ขาประจำ",              description: "เติมเหรียญครบ 10 ครั้ง",     icon: "Coins",        category: "engagement", metric: "topups",          threshold: 10 },
  { key: "topup-30",  title: "ผู้สนับสนุนระดับตำนาน",  description: "เติมเหรียญครบ 30 ครั้ง",     icon: "Medal",        category: "engagement", metric: "topups",          threshold: 30 },

  // ── Reviews / explore / social ──
  { key: "rating-5",     title: "นักวิจารณ์",         description: "ให้คะแนน 5 เรื่อง",         icon: "Star",         category: "social",     metric: "ratings",         threshold: 5 },
  { key: "rating-30",    title: "นักรีวิวมือฉมัง",     description: "ให้คะแนน 30 เรื่อง",        icon: "Star",         category: "social",     metric: "ratings",         threshold: 30 },
  { key: "rating-100",   title: "กูรูรีวิว",          description: "ให้คะแนน 100 เรื่อง",       icon: "Award",        category: "social",     metric: "ratings",         threshold: 100 },
  { key: "bookmark-20",  title: "ชั้นหนังสือส่วนตัว",  description: "บุ๊กมาร์ก 20 เรื่อง",        icon: "Bookmark",     category: "social",     metric: "bookmarks",       threshold: 20 },
  { key: "bookmark-100", title: "บรรณารักษ์",         description: "บุ๊กมาร์ก 100 เรื่อง",       icon: "Bookmark",     category: "social",     metric: "bookmarks",       threshold: 100 },
  { key: "genre-8",      title: "นักผจญภัยหลายแนว",   description: "อ่านครบ 8 แนว",            icon: "Compass",      category: "social",     metric: "genresRead",      threshold: 8 },
  { key: "comment-10",   title: "นักพูดคุย",          description: "คอมเมนต์ 10 ครั้ง",         icon: "MessageSquare", category: "social",    metric: "comments",        threshold: 10 },
  { key: "comment-75",   title: "ขาเมาท์ตัวยง",       description: "คอมเมนต์ 75 ครั้ง",         icon: "MessageSquare", category: "social",    metric: "comments",        threshold: 75 },
];

/** Compute every stat an achievement can depend on, in one batch. */
async function computeStats(userId: string): Promise<Stats> {
  const [chaptersRead, bookmarks, ratings, premiumUnlocked, topups, comments, spentAgg, reads] =
    await Promise.all([
      prisma.readHistory.count({ where: { userId } }),
      prisma.bookmark.count({ where: { userId } }),
      prisma.rating.count({ where: { userId } }),
      prisma.unlockedChapter.count({ where: { userId } }),
      prisma.coinOrder.count({ where: { userId, status: "PAID" } }),
      prisma.comment.count({ where: { userId } }),
      prisma.unlockedChapter.aggregate({ where: { userId }, _sum: { coinSpent: true } }),
      prisma.readHistory.findMany({
        where: { userId },
        select: { chapter: { select: { mangaId: true } } },
      }),
    ]);

  // Read counts per manga → completed series + genres explored.
  const perManga = new Map<string, number>();
  for (const r of reads) {
    const mid = r.chapter.mangaId;
    perManga.set(mid, (perManga.get(mid) ?? 0) + 1);
  }
  const mangaIds = [...perManga.keys()];
  let mangaCompleted = 0;
  let genresRead = 0;
  if (mangaIds.length > 0) {
    const totals = await prisma.chapter.groupBy({
      by: ["mangaId"],
      where: { mangaId: { in: mangaIds } },
      _count: { _all: true },
    });
    const totalMap = new Map(totals.map((t) => [t.mangaId, t._count._all]));
    for (const [mid, cnt] of perManga) {
      const total = totalMap.get(mid) ?? 0;
      if (total > 0 && cnt >= total) mangaCompleted++;
    }
    const genreRows = await prisma.mangaGenre.findMany({
      where: { mangaId: { in: mangaIds } },
      select: { genreId: true },
    });
    genresRead = new Set(genreRows.map((g) => g.genreId)).size;
  }

  return {
    chaptersRead,
    mangaCompleted,
    genresRead,
    bookmarks,
    ratings,
    premiumUnlocked,
    topups,
    comments,
    coinsSpent: spentAgg._sum.coinSpent ?? 0,
  };
}

/**
 * Check the user's current stats against every achievement, unlock any newly
 * earned ones (badge + notification only — no coins), and notify. Idempotent:
 * the UserAchievement primary key prevents double-unlocking even under races.
 * Returns the achievements unlocked on THIS call.
 */
export async function evaluateAchievements(userId: string): Promise<AchievementDef[]> {
  try {
    const [stats, unlockedRows] = await Promise.all([
      computeStats(userId),
      prisma.userAchievement.findMany({ where: { userId }, select: { achievementKey: true } }),
    ]);
    const have = new Set(unlockedRows.map((r) => r.achievementKey));
    const newlyMet = ACHIEVEMENTS.filter(
      (a) => !have.has(a.key) && stats[a.metric] >= a.threshold
    );

    const unlocked: AchievementDef[] = [];
    for (const def of newlyMet) {
      try {
        // Throws P2002 if another request already inserted it (race) → skip.
        // Achievements are status/challenges only — no coin reward (avoids coin inflation).
        await prisma.userAchievement.create({
          data: { userId, achievementKey: def.key },
        });
        unlocked.push(def);
        await createNotification({
          userId,
          type: "ACHIEVEMENT",
          title: "ปลดล็อกความสำเร็จ 🏆",
          body: def.title,
          link: "/achievements",
        });
      } catch {
        // Already unlocked (race) — ignore.
      }
    }
    return unlocked;
  } catch (err) {
    console.error("[evaluateAchievements]", err);
    return [];
  }
}

const BY_KEY = new Map(ACHIEVEMENTS.map((a) => [a.key, a]));

/** A user's unlocked achievements (most recent first) — for profiles. */
export async function getUnlockedAchievements(
  userId: string,
  limit = 8
): Promise<(AchievementDef & { unlockedAt: Date })[]> {
  const rows = await prisma.userAchievement.findMany({
    where: { userId },
    orderBy: { unlockedAt: "desc" },
    take: limit,
  });
  return rows
    .map((r) => {
      const def = BY_KEY.get(r.achievementKey);
      return def ? { ...def, unlockedAt: r.unlockedAt } : null;
    })
    .filter((x): x is AchievementDef & { unlockedAt: Date } => x !== null);
}

export interface AchievementProgress extends AchievementDef {
  current: number;
  unlocked: boolean;
  unlockedAt: Date | null;
}

/** All achievements with the user's progress — for the achievements page. */
export async function getAchievementProgress(userId: string): Promise<{
  items: AchievementProgress[];
  stats: Stats;
  unlockedCount: number;
}> {
  const [stats, unlockedRows] = await Promise.all([
    computeStats(userId),
    prisma.userAchievement.findMany({ where: { userId } }),
  ]);
  const unlockedMap = new Map(unlockedRows.map((r) => [r.achievementKey, r.unlockedAt]));
  const items = ACHIEVEMENTS.map((def) => ({
    ...def,
    current: stats[def.metric],
    unlocked: unlockedMap.has(def.key),
    unlockedAt: unlockedMap.get(def.key) ?? null,
  }));
  return { items, stats, unlockedCount: unlockedMap.size };
}
