"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Coins, Loader2, CheckCircle2 } from "lucide-react";

export default function BuyBook({
  mangaId,
  bookPrice,
  userCoins,
  isLoggedIn,
  separateTotal,
}: {
  mangaId: string;
  bookPrice: number;
  userCoins: number;
  isLoggedIn: boolean;
  separateTotal: number; // sum of still-locked chapters' coinCosts
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ coinsSpent: number; coinsLeft: number } | null>(null);

  const canAfford = userCoins >= bookPrice;
  const hasSavings = separateTotal > bookPrice;
  const savings = separateTotal - bookPrice;

  async function buyBook() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/coin/buy-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mangaId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "INSUFFICIENT_COINS"
            ? "เหรียญไม่พอ กรุณาเติมเหรียญก่อน"
            : data.error === "ALREADY_OWNED"
            ? "คุณเป็นเจ้าของเล่มนี้แล้ว"
            : "เกิดข้อผิดพลาด กรุณาลองใหม่"
        );
        return;
      }
      setDone({ coinsSpent: data.coinsSpent, coinsLeft: data.coinsLeft });
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        เป็นเจ้าของแล้ว ✓ อ่านได้ทันที (ใช้ {done.coinsSpent} เหรียญ · เหลือ {done.coinsLeft.toLocaleString()})
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[var(--text-primary)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">ซื้อทั้งเล่ม</span>
        </div>
        <span className="text-xs text-[var(--text-secondary)]">ปลดล็อกทุกตอนที่เหลือ</span>
      </div>

      {/* Price row */}
      <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl px-4 py-3">
        <span className="text-sm text-[var(--text-secondary)]">ราคาทั้งเล่ม</span>
        <div className="flex items-center gap-2 font-semibold">
          {hasSavings && (
            <span className="text-xs text-[var(--text-muted)] line-through tabular-nums">
              {separateTotal.toLocaleString()}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
            <Coins className="w-4 h-4" />
            <span className="tabular-nums">{bookPrice.toLocaleString()} เหรียญ</span>
          </div>
        </div>
      </div>

      {/* Savings line */}
      {hasSavings && (
        <p className="text-xs text-[var(--text-primary)] text-center">
          ปกติ {separateTotal.toLocaleString()} · ประหยัด {savings.toLocaleString()} เหรียญ
        </p>
      )}

      {/* Balance row */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-[var(--text-secondary)]">
          เหรียญของคุณ:{" "}
          <span className="text-[var(--text-primary)]">{userCoins.toLocaleString()}</span>
        </span>
        {canAfford && isLoggedIn && (
          <span className="text-[var(--text-secondary)]">
            หลังซื้อ: {(userCoins - bookPrice).toLocaleString()}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-[var(--text-primary)] text-center bg-[var(--bg-card)] rounded-lg py-2 px-3">
          {error}
        </p>
      )}

      {/* Action */}
      {!isLoggedIn ? (
        <a
          href="/auth/signin"
          className="block w-full py-3 rounded-xl bal-btn font-semibold text-sm text-center hover:opacity-90 transition-colors"
        >
          เข้าสู่ระบบเพื่อซื้อ
        </a>
      ) : canAfford ? (
        <button
          onClick={buyBook}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bal-btn font-semibold text-sm hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          {loading ? "กำลังซื้อ..." : `ซื้อทั้งเล่ม · ${bookPrice.toLocaleString()} เหรียญ`}
        </button>
      ) : (
        <a
          href="/topup"
          className="block w-full py-3 rounded-xl bg-[var(--text-primary)] text-black font-semibold text-sm text-center hover:bg-[var(--bg-surface)] transition-colors"
        >
          เติมเหรียญ
        </a>
      )}
    </div>
  );
}
