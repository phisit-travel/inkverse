"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Coins, Loader2, Check } from "lucide-react";

const PRESETS = [10, 50, 100];

export default function TipButton({
  translatorId,
  penName,
  isLoggedIn,
}: {
  translatorId: string;
  penName: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(50);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (!isLoggedIn) {
      window.location.href = "/auth/signin";
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/translator/${translatorId}/tip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coins: amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "INSUFFICIENT_COINS"
            ? "เหรียญไม่พอ"
            : data.error === "SELF_TIP"
            ? "ทิปตัวเองไม่ได้"
            : "เกิดข้อผิดพลาด"
        );
        return;
      }
      setDone(true);
      router.refresh();
      setTimeout(() => {
        setDone(false);
        setOpen(false);
      }, 1600);
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] text-xs font-semibold uppercase tracking-widest text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-colors"
      >
        <Heart className="w-3.5 h-3.5" />
        ทิปนักแปล
      </button>

      {open && (
        <div className="mt-3 w-64 border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          {done ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--text-primary)]">
              <Check className="w-4 h-4" />
              ขอบคุณที่สนับสนุน {penName}!
            </div>
          ) : (
            <>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-3">
                สนับสนุน {penName}
              </p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(p)}
                    className={`py-2 border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                      amount === p
                        ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]"
                        : "bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--text-primary)]/50"
                    }`}
                  >
                    <Coins className="w-3 h-3" />
                    {p}
                  </button>
                ))}
              </div>
              {error && (
                <p className="text-xs text-[var(--text-primary)] mb-2">{error}</p>
              )}
              <button
                onClick={send}
                disabled={loading}
                className="w-full py-2 bal-btn text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>ทิป {amount} เหรียญ</>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
