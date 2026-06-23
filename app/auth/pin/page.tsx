"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSession, signOut, SessionProvider } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Logo from "@/components/ui/Logo";

function isSafe(url: string) {
  // Only allow same-site relative redirects (never an external URL).
  return url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/auth/pin");
}

function PinForm() {
  const { update } = useSession();
  const searchParams = useSearchParams();
  const raw = searchParams.get("callbackUrl") || "/";
  const callbackUrl = isSafe(raw) ? raw : "/";

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const pin = digits.join("");

  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = d;
      return next;
    });
    if (d && i < 5) inputs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    inputs.current[Math.min(text.length, 5)]?.focus();
  };

  const submit = async (value: string) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/pin-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message || "PIN ไม่ถูกต้อง");
        setDigits(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
        setLoading(false);
        return;
      }
      // Server marked this session pin-verified. Force a session UPDATE (POST,
      // trigger:"update") — not a plain refresh — so the jwt callback re-runs,
      // clears pinPending, and PERSISTS the new token to the cookie. A no-arg
      // update() only does a read (GET) and won't rewrite the cookie, so the
      // gate wouldn't clear. Passing data forces the POST path.
      await update({ pinVerified: true });
      window.location.href = callbackUrl;
    } catch {
      setError("เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
      setLoading(false);
    }
  };

  // Auto-submit once all six digits are filled.
  useEffect(() => {
    if (pin.length === 6 && !loading) submit(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="lg" href="/" />
        </div>

        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-8">
          <h1 className="font-bebas text-3xl text-[var(--text-primary)] tracking-wider text-center mb-2">
            ใส่ PIN
          </h1>
          <p className="text-sm text-[var(--text-secondary)] text-center mb-8">
            กรอก PIN 6 หลักเพื่อยืนยันตัวตน
          </p>

          <div className="flex justify-center gap-2 sm:gap-3 mb-6" onPaste={onPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                type="password"
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={d}
                disabled={loading}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/60 transition-colors disabled:opacity-60"
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-[var(--text-primary)] text-center mb-4">{error}</p>
          )}

          {loading && (
            <p className="text-xs text-[var(--text-secondary)] text-center mb-4">
              กำลังตรวจสอบ...
            </p>
          )}

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="w-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mt-2"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PinPage() {
  return (
    <SessionProvider>
      <Suspense fallback={null}>
        <PinForm />
      </Suspense>
    </SessionProvider>
  );
}
