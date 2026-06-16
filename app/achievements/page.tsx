import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  evaluateAchievements,
  getAchievementProgress,
} from "@/lib/achievements";
import { getReaderRank } from "@/lib/ranks";
import AchievementBook from "@/components/ui/AchievementBook";
import {
  BookOpen, Flame, Crown, Trophy, Coins, Check,
  Sprout, Footprints, Swords, Shield, Gem, ArrowRight,
} from "lucide-react";
import type { Metadata } from "next";
import type { ComponentType } from "react";

export const metadata: Metadata = {
  title: "ความสำเร็จ — INKVERSE",
  description: "เก็บความสำเร็จจากการอ่าน ปลดล็อกเหรียญตรา และไต่อันดับนักอ่าน",
};

const RANK_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Sprout, Footprints, BookOpen, Swords, Flame, Shield, Gem, Crown,
};

export default async function AchievementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?callbackUrl=/achievements");
  const userId = (session.user as { id: string }).id;

  // Catch achievements unlocked by non-reading actions (topup, rating, …).
  await evaluateAchievements(userId);
  const [{ items, unlockedCount, stats }, coinSpentAgg] = await Promise.all([
    getAchievementProgress(userId),
    prisma.unlockedChapter.aggregate({ where: { userId }, _sum: { coinSpent: true } }),
  ]);

  const coinsSpent = coinSpentAgg._sum.coinSpent ?? 0;
  const rank = getReaderRank(stats.chaptersRead, coinsSpent);
  const RankIcon = RANK_ICONS[rank.current.icon] ?? BookOpen;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="eyebrow text-[var(--text-secondary)]">CHALLENGES</p>
        <h1 className="font-bebas text-4xl sm:text-5xl text-[var(--text-primary)] tracking-wider flex items-center gap-3">
          <Trophy className="w-8 h-8" /> ความสำเร็จ
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          อ่าน อ่านจบ และมีส่วนร่วม เพื่อสะสมความสำเร็จและไต่ยศนักอ่าน
        </p>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-4">
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {unlockedCount}/{items.length}
            </p>
            <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)] mt-0.5">
              ปลดล็อกแล้ว
            </p>
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-4">
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {Math.round((unlockedCount / items.length) * 100)}%
            </p>
            <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)] mt-0.5">
              ความคืบหน้า
            </p>
          </div>
        </div>
      </div>

      {/* Reader rank — progress + what's missing to rank up */}
      <div className="mb-10 border border-[var(--text-primary)]/30 bg-[var(--bg-surface)] p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 flex items-center justify-center bg-[var(--text-primary)] text-[var(--bg-primary)] shrink-0">
            <RankIcon className="w-8 h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              CURRENT RANK · LV.{rank.current.level}
            </p>
            <p className="font-bebas text-3xl text-[var(--text-primary)] tracking-wider uppercase">
              {rank.current.nameEn}
            </p>
          </div>
        </div>

        {rank.next ? (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[var(--text-secondary)] flex items-center gap-1">
                ยศถัดไป <ArrowRight className="w-3 h-3" />{" "}
                <span className="text-[var(--text-primary)] font-semibold uppercase">{rank.next.nameEn}</span>
              </span>
              <span className="text-[var(--text-primary)] font-semibold">{rank.percentToNext}%</span>
            </div>
            <div className="h-2 w-full bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden">
              <div className="h-full bg-[var(--text-primary)] transition-all" style={{ width: `${rank.percentToNext}%` }} />
            </div>
            {/* What's still missing */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`text-[11px] px-2 py-1 border flex items-center gap-1 ${rank.readsToNext > 0 ? "border-[var(--border)] text-[var(--text-secondary)]" : "border-[var(--text-primary)]/40 text-[var(--text-primary)]"}`}>
                {rank.readsToNext > 0 ? <BookOpen className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                {rank.readsToNext > 0 ? `อ่านอีก ${rank.readsToNext} ตอน` : "เงื่อนไขการอ่านครบแล้ว"}
              </span>
              <span className={`text-[11px] px-2 py-1 border flex items-center gap-1 ${rank.coinsToNext > 0 ? "border-[var(--border)] text-[var(--text-secondary)]" : "border-[var(--text-primary)]/40 text-[var(--text-primary)]"}`}>
                {rank.coinsToNext > 0 ? <Coins className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                {rank.coinsToNext > 0 ? `ใช้เหรียญปลดล็อกอีก ${rank.coinsToNext}` : "เงื่อนไขเหรียญครบแล้ว"}
              </span>
            </div>
            {rank.readsToNext === 0 && rank.coinsToNext === 0 && (
              <p className="text-[11px] text-[var(--text-primary)] mt-2">🎉 ครบทุกเงื่อนไข — อ่านอีกตอนเพื่อเลื่อนยศ!</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-primary)] mt-4 flex items-center gap-1">
            <Crown className="w-4 h-4" /> คุณคือยศสูงสุดแล้ว — ตำนานนักอ่าน!
          </p>
        )}
      </div>

      {/* Achievement book — flip through your achievements by category */}
      <AchievementBook items={items} unlockedCount={unlockedCount} />
    </div>
  );
}
