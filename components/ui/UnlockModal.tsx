"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Lock, X } from "lucide-react";

interface UnlockModalProps {
  chapterId: string;
  chapterNum: number;
  coinCost: number;
  userCoins: number;
  mangaSlug: string;
  onClose: () => void;
}

export default function UnlockModal({
  chapterId,
  chapterNum,
  coinCost,
  userCoins,
  mangaSlug,
  onClose,
}: UnlockModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAfford = userCoins >= coinCost;

  async function handleUnlock() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "INSUFFICIENT_COINS"
            ? "เหรียญไม่พอ กรุณาเติมเหรียญก่อน"
            : "เกิดข้อผิดพลาด กรุณาลองใหม่"
        );
        return;
      }
      // Success — navigate to reader
      router.push(`/content/${mangaSlug}/${chapterNum}`);
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm ">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[var(--text-primary)]" />
            <h2 className="text-[var(--text-primary)] font-semibold">ปลดล็อกตอน</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-[var(--text-primary)] text-sm">
            ตอนที่ <span className="text-[var(--text-primary)] font-semibold">{chapterNum}</span>{" "}
            เป็นตอน Premium ต้องใช้เหรียญเพื่อปลดล็อก
          </p>

          {/* Cost */}
          <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl px-4 py-3">
            <span className="text-sm text-[var(--text-secondary)]">ราคา</span>
            <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-semibold">
              <Coins className="w-4 h-4" />
              <span>{coinCost} เหรียญ</span>
            </div>
          </div>

          {/* User balance */}
          <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl px-4 py-3">
            <span className="text-sm text-[var(--text-secondary)]">เหรียญของคุณ</span>
            <div
              className={`flex items-center gap-1.5 font-semibold ${
                canAfford ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>{userCoins} เหรียญ</span>
            </div>
          </div>

          {/* After unlock balance */}
          {canAfford && (
            <p className="text-xs text-[var(--text-secondary)] text-center">
              หลังปลดล็อก: {userCoins - coinCost} เหรียญ
            </p>
          )}

          {error && (
            <p className="text-sm text-[var(--text-primary)] text-center bg-[var(--bg-card)] rounded-lg py-2 px-3">
              {error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 pt-0">
          {canAfford ? (
            <button
              onClick={handleUnlock}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bal-btn font-semibold text-sm hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {loading ? "กำลังปลดล็อก..." : `ปลดล็อก ${coinCost} เหรียญ`}
            </button>
          ) : (
            <a
              href="/topup"
              className="flex-1 py-3 rounded-xl bg-[var(--text-primary)] text-black font-semibold text-sm text-center hover:bg-[var(--bg-surface)] transition-colors"
            >
              เติมเหรียญ
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm hover:border-white/30 transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
