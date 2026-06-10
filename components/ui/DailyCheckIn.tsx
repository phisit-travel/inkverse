"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Coins, Flame, Check, Loader2 } from "lucide-react";

interface Status {
  claimedToday: boolean;
  streak: number;
  nextReward: number;
}

export default function DailyCheckIn() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [justClaimed, setJustClaimed] = useState<{ coins: number; streak: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/daily-checkin");
      if (!res.ok) return; // 401 (signed out) → stay hidden
      setStatus(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function claim() {
    setLoading(true);
    try {
      const res = await fetch("/api/daily-checkin", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setJustClaimed({ coins: data.coinsEarned, streak: data.streak });
        setStatus({ claimedToday: true, streak: data.streak, nextReward: status?.nextReward ?? 2 });
        router.refresh(); // refresh coin balance in the navbar
      } else {
        // Already claimed elsewhere — reflect that state.
        setStatus((s) => (s ? { ...s, claimedToday: true } : s));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  // Hidden until we know the user is signed in.
  if (!status) return null;

  const claimed = status.claimedToday;

  return (
    <div className="mb-6 flex items-center justify-between gap-4 bg-[var(--bg-surface)] border border-[var(--border)] px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border)] shrink-0">
          {claimed ? (
            <Check className="w-4 h-4 text-[var(--text-primary)]" />
          ) : (
            <Coins className="w-4 h-4 text-[var(--text-primary)]" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
            เช็คอินรายวัน
          </p>
          <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
            {status.streak > 0 && (
              <>
                <Flame className="w-3 h-3 text-[var(--text-primary)]" />
                สตรีค {status.streak} วัน ·{" "}
              </>
            )}
            {justClaimed
              ? `รับไปแล้ว +${justClaimed.coins} เหรียญ`
              : claimed
              ? "วันนี้รับแล้ว กลับมาใหม่พรุ่งนี้"
              : `รับวันนี้ +${status.nextReward} เหรียญ`}
          </p>
        </div>
      </div>

      <button
        onClick={claim}
        disabled={claimed || loading}
        className="bal-btn shrink-0 px-4 py-2 text-xs font-semibold uppercase tracking-widest disabled:opacity-40 disabled:cursor-default flex items-center gap-1.5"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : claimed ? (
          "รับแล้ว"
        ) : (
          "เช็คอิน"
        )}
      </button>
    </div>
  );
}
