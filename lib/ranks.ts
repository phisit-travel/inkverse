import { prisma } from "./prisma";

/**
 * Reader rank ladder. Rank is DERIVED (not stored): the highest tier whose BOTH
 * conditions are met — chapters read AND coins spent unlocking premium chapters.
 *
 * Difficulty curve (by request): early tiers are reading-only and medium effort;
 * from the mid tier on, ranking up also requires spending coins to unlock
 * chapters, and both thresholds climb steeply in the second half.
 */

export interface ReaderRank {
  level: number; // 1-based
  name: string; // Thai
  nameEn: string;
  icon: string; // lucide icon name, mapped in the UI
  minReads: number; // chapters read required
  minCoinsSpent: number; // coins spent unlocking required
}

export const READER_RANKS: ReaderRank[] = [
  { level: 1, name: "ผู้เริ่มต้น",        nameEn: "Awakened",     icon: "Sprout",     minReads: 0,    minCoinsSpent: 0 },
  { level: 2, name: "นักอ่านพเนจร",       nameEn: "Disciple",     icon: "Footprints", minReads: 10,   minCoinsSpent: 0 },
  { level: 3, name: "นักอ่านชั้นต้น",      nameEn: "Adept",        icon: "BookOpen",   minReads: 30,   minCoinsSpent: 0 },
  { level: 4, name: "นักอ่านชั้นกลาง",     nameEn: "Ascendant",    icon: "Swords",     minReads: 80,   minCoinsSpent: 0 },
  // ── second half: coins required, thresholds climb hard ──
  { level: 5, name: "นักอ่านชั้นสูง",      nameEn: "Sovereign",    icon: "Flame",      minReads: 175,  minCoinsSpent: 100 },
  { level: 6, name: "ปรมาจารย์นักอ่าน",    nameEn: "Saint",        icon: "Shield",     minReads: 350,  minCoinsSpent: 350 },
  { level: 7, name: "มหาเซียนนักอ่าน",     nameEn: "Transcendent", icon: "Gem",        minReads: 700,  minCoinsSpent: 900 },
  { level: 8, name: "ตำนานนักอ่าน",        nameEn: "Immortal",     icon: "Crown",      minReads: 1400, minCoinsSpent: 2000 },
];

export interface RankInfo {
  current: ReaderRank;
  next: ReaderRank | null;
  index: number; // 0-based index of current in READER_RANKS
  readsToNext: number;
  coinsToNext: number;
  /** % toward the next rank (min of the two requirement bars). 100 if maxed. */
  percentToNext: number;
}

export function getReaderRank(chaptersRead: number, coinsSpent: number): RankInfo {
  // Thresholds increase monotonically, so the first unmet tier ends the climb.
  let index = 0;
  for (let i = 0; i < READER_RANKS.length; i++) {
    const r = READER_RANKS[i];
    if (chaptersRead >= r.minReads && coinsSpent >= r.minCoinsSpent) index = i;
    else break;
  }
  const current = READER_RANKS[index];
  const next = READER_RANKS[index + 1] ?? null;

  let percentToNext = 100;
  if (next) {
    const readSpan = next.minReads - current.minReads;
    const coinSpan = next.minCoinsSpent - current.minCoinsSpent;
    const readPct = readSpan > 0 ? (chaptersRead - current.minReads) / readSpan : 1;
    const coinPct = coinSpan > 0 ? (coinsSpent - current.minCoinsSpent) / coinSpan : 1;
    percentToNext = Math.max(0, Math.min(100, Math.round(Math.min(readPct, coinPct) * 100)));
  }

  return {
    current,
    next,
    index,
    readsToNext: next ? Math.max(0, next.minReads - chaptersRead) : 0,
    coinsToNext: next ? Math.max(0, next.minCoinsSpent - coinsSpent) : 0,
    percentToNext,
  };
}

/* ───────────────────────── Translator ranks ─────────────────────────
 * A separate ladder for creators, earned by published work + total reach.
 * To rank up you must meet BOTH thresholds (chapters AND total views). */

export interface TranslatorRank {
  level: number;
  name: string;
  nameEn: string;
  icon: string;
  minChapters: number;
  minViews: number;
}

export const TRANSLATOR_RANKS: TranslatorRank[] = [
  { level: 1, name: "นักแปลฝึกหัด",     nameEn: "Scribe",    icon: "PenTool",    minChapters: 0,    minViews: 0 },
  { level: 2, name: "นักแปลมือใหม่",     nameEn: "Artisan",   icon: "Feather",    minChapters: 30,   minViews: 5000 },
  { level: 3, name: "นักแปลชำนาญ",       nameEn: "Maestro",   icon: "BookMarked", minChapters: 150,  minViews: 50000 },
  { level: 4, name: "นักแปลชั้นครู",      nameEn: "Luminary",  icon: "Award",      minChapters: 500,  minViews: 300000 },
  { level: 5, name: "ปรมาจารย์นักแปล",   nameEn: "Celestial", icon: "Crown",     minChapters: 1200, minViews: 1000000 },
];

export interface TranslatorRankInfo {
  current: TranslatorRank;
  next: TranslatorRank | null;
  index: number;
  chaptersToNext: number;
  viewsToNext: number;
  percentToNext: number;
}

export function getTranslatorRank(chapters: number, views: number): TranslatorRankInfo {
  let index = 0;
  for (let i = 0; i < TRANSLATOR_RANKS.length; i++) {
    const r = TRANSLATOR_RANKS[i];
    if (chapters >= r.minChapters && views >= r.minViews) index = i;
    else break;
  }
  const current = TRANSLATOR_RANKS[index];
  const next = TRANSLATOR_RANKS[index + 1] ?? null;

  let percentToNext = 100;
  if (next) {
    const chSpan = next.minChapters - current.minChapters;
    const vSpan = next.minViews - current.minViews;
    const chPct = chSpan > 0 ? (chapters - current.minChapters) / chSpan : 1;
    const vPct = vSpan > 0 ? (views - current.minViews) / vSpan : 1;
    percentToNext = Math.max(0, Math.min(100, Math.round(Math.min(chPct, vPct) * 100)));
  }

  return {
    current,
    next,
    index,
    chaptersToNext: next ? Math.max(0, next.minChapters - chapters) : 0,
    viewsToNext: next ? Math.max(0, next.minViews - views) : 0,
    percentToNext,
  };
}

/* ─────────────────── Compact rank badges (navbar / comments) ─────────────────── */

export type RankBadgeKind = "reader" | "translator" | "admin";
export interface RankBadge {
  kind: RankBadgeKind;
  level: number;
  nameEn: string;
}

/** A single user's badge — used in the navbar. `role` lets us skip a query. */
export async function getUserRankBadge(userId: string, role?: string): Promise<RankBadge> {
  if (role === "ADMIN") return { kind: "admin", level: 0, nameEn: "Official" };

  const translator = await prisma.translator.findUnique({
    where: { userId },
    select: { mangas: { select: { totalViews: true, _count: { select: { chapters: true } } } } },
  });
  if (translator) {
    const ch = translator.mangas.reduce((s, m) => s + m._count.chapters, 0);
    const v = translator.mangas.reduce((s, m) => s + m.totalViews, 0);
    const r = getTranslatorRank(ch, v);
    return { kind: "translator", level: r.current.level, nameEn: r.current.nameEn };
  }

  const [reads, spent] = await Promise.all([
    prisma.readHistory.count({ where: { userId } }),
    prisma.unlockedChapter.aggregate({ where: { userId }, _sum: { coinSpent: true } }),
  ]);
  const r = getReaderRank(reads, spent._sum.coinSpent ?? 0);
  return { kind: "reader", level: r.current.level, nameEn: r.current.nameEn };
}

/** Batch badges for many users (comment lists) — fixed number of queries. */
export async function getRankBadges(userIds: string[]): Promise<Map<string, RankBadge>> {
  const ids = [...new Set(userIds)];
  const out = new Map<string, RankBadge>();
  if (ids.length === 0) return out;

  const [users, reads, spent, translators] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, role: true } }),
    prisma.readHistory.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _count: { userId: true } }),
    prisma.unlockedChapter.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _sum: { coinSpent: true } }),
    prisma.translator.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, mangas: { select: { totalViews: true, _count: { select: { chapters: true } } } } },
    }),
  ]);
  const readMap = new Map(reads.map((r) => [r.userId, r._count.userId]));
  const spentMap = new Map(spent.map((s) => [s.userId, s._sum.coinSpent ?? 0]));
  const tMap = new Map(
    translators.map((t) => [
      t.userId,
      {
        ch: t.mangas.reduce((s, m) => s + m._count.chapters, 0),
        v: t.mangas.reduce((s, m) => s + m.totalViews, 0),
      },
    ])
  );

  for (const u of users) {
    if (u.role === "ADMIN") {
      out.set(u.id, { kind: "admin", level: 0, nameEn: "Official" });
      continue;
    }
    const t = tMap.get(u.id);
    if (t) {
      const r = getTranslatorRank(t.ch, t.v);
      out.set(u.id, { kind: "translator", level: r.current.level, nameEn: r.current.nameEn });
    } else {
      const r = getReaderRank(readMap.get(u.id) ?? 0, spentMap.get(u.id) ?? 0);
      out.set(u.id, { kind: "reader", level: r.current.level, nameEn: r.current.nameEn });
    }
  }
  return out;
}
