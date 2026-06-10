"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Coins, Unlock, Loader2, CheckCircle2, Layers } from "lucide-react";
import clsx from "clsx";

interface LockedChapter {
  id: string;
  chapterNum: number;
  coinCost: number;
}

export default function BulkUnlock({
  chapters,
  userCoins,
  isLoggedIn,
}: {
  chapters: LockedChapter[]; // locked premium chapters, ascending by chapterNum
  userCoins: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const total = chapters.length;
  const [count, setCount] = useState(Math.min(5, total));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ unlocked: number; spent: number; saved: number } | null>(null);

  // The first `count` locked chapters (cheapest to reach = earliest).
  const selected = useMemo(() => chapters.slice(0, count), [chapters, count]);
  const rawCost = useMemo(() => selected.reduce((s, c) => s + c.coinCost, 0), [selected]);
  // Mirror of bulkDiscountRate() in lib/coins.ts — keep the tiers in sync.
  const discountRate = count >= 50 ? 0.15 : count >= 20 ? 0.1 : count >= 10 ? 0.05 : 0;
  const payCost = Math.round(rawCost * (1 - discountRate));
  const saved = rawCost - payCost;
  const canAfford = userCoins >= payCost;

  // How many more chapters until the next discount tier kicks in.
  const nextTier = count < 10 ? 10 : count < 20 ? 20 : count < 50 ? 50 : null;
  const nextTierPct = nextTier === 10 ? 5 : nextTier === 20 ? 10 : 15;

  const quickPicks = [5, 10, 20, 50].filter((n) => n < total);

  async function unlock() {
    if (!isLoggedIn) {
      window.location.href = "/auth/signin";
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/coin/unlock-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterIds: selected.map((c) => c.id) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "INSUFFICIENT_COINS"
            ? "เหรียญไม่พอ กรุณาเติมเหรียญก่อน"
            : data.error === "NOTHING_TO_UNLOCK"
            ? "ไม่มีตอนให้ปลดล็อก"
            : "เกิดข้อผิดพลาด กรุณาลองใหม่"
        );
        return;
      }
      setDone({
        unlocked: data.unlockedCount,
        spent: data.coinsSpent,
        saved: data.coinsSaved ?? 0,
      });
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  if (total === 0) return null;

  if (done) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        ปลดล็อก {done.unlocked} ตอนสำเร็จ (ใช้ {done.spent} เหรียญ
        {done.saved > 0 ? ` · ประหยัด ${done.saved} เหรียญ` : ""})
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--text-primary)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">ปลดล็อกหลายตอน</span>
        </div>
        <span className="text-xs text-[var(--text-secondary)]">ล็อกอยู่ {total} ตอน</span>
      </div>

      {/* Quick picks */}
      <div className="flex flex-wrap gap-2">
        {quickPicks.map((n) => (
          <button
            key={n}
            onClick={() => setCount(n)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
              count === n
                ? "bg-[var(--text-primary)]/20 text-[var(--text-primary)] border-[var(--text-primary)]/40"
                : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-white/30"
            )}
          >
            {n} ตอน
          </button>
        ))}
        <button
          onClick={() => setCount(total)}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
            count === total
              ? "bg-[var(--text-primary)]/20 text-[var(--text-primary)] border-[var(--text-primary)]/40"
              : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-white/30"
          )}
        >
          ทั้งหมด ({total})
        </button>
      </div>

      {/* Slider */}
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={total}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="flex-1 accent-[var(--text-primary)]"
        />
        <span className="text-sm text-[var(--text-primary)] font-semibold w-16 text-right tabular-nums">
          {count} ตอน
        </span>
      </div>

      {/* Cost summary */}
      <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl px-4 py-3">
        <span className="text-sm text-[var(--text-secondary)]">ราคารวม</span>
        <div className="flex items-center gap-2 font-semibold">
          {discountRate > 0 && (
            <span className="text-xs text-[var(--text-muted)] line-through tabular-nums">
              {rawCost.toLocaleString()}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
            <Coins className="w-4 h-4" />
            <span className="tabular-nums">{payCost.toLocaleString()} เหรียญ</span>
          </div>
        </div>
      </div>

      {/* Discount line / next-tier nudge */}
      {discountRate > 0 ? (
        <p className="text-xs text-[var(--text-primary)] text-center">
          ส่วนลด {Math.round(discountRate * 100)}% · ประหยัด {saved.toLocaleString()} เหรียญ
        </p>
      ) : (
        nextTier !== null && nextTier <= total && (
          <p className="text-xs text-[var(--text-muted)] text-center">
            ปลดอีก {nextTier - count} ตอน รับส่วนลด {nextTierPct}%
          </p>
        )
      )}

      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-[var(--text-secondary)]">
          เหรียญของคุณ: <span className={canAfford ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"}>{userCoins.toLocaleString()}</span>
        </span>
        {canAfford && (
          <span className="text-[var(--text-secondary)]">หลังปลดล็อก: {(userCoins - payCost).toLocaleString()}</span>
        )}
      </div>

      {error && (
        <p className="text-sm text-[var(--text-primary)] text-center bg-[var(--bg-card)] rounded-lg py-2 px-3">{error}</p>
      )}

      {/* Action */}
      {!isLoggedIn ? (
        <a href="/auth/signin" className="block w-full py-3 rounded-xl bal-btn font-semibold text-sm text-center hover:opacity-90 transition-colors">
          เข้าสู่ระบบเพื่อปลดล็อก
        </a>
      ) : canAfford ? (
        <button
          onClick={unlock}
          disabled={loading || count < 1}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bal-btn font-semibold text-sm hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
          {loading ? "กำลังปลดล็อก..." : `ปลดล็อก ${count} ตอน · ${payCost.toLocaleString()} เหรียญ`}
        </button>
      ) : (
        <a href="/topup" className="block w-full py-3 rounded-xl bg-[var(--text-primary)] text-black font-semibold text-sm text-center hover:bg-[var(--bg-surface)] transition-colors">
          เติมเหรียญ
        </a>
      )}
    </div>
  );
}
