"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push("/auth/signin"), 1800);
      } else {
        setError(data.error || "ตั้งรหัสผ่านไม่สำเร็จ");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8"><Logo size="lg" href="/" /></div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-8">
          <h1 className="font-bebas text-3xl text-[var(--text-primary)] tracking-wider text-center mb-6 uppercase">
            ตั้งรหัสผ่านใหม่
          </h1>

          {done ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">
              ตั้งรหัสผ่านใหม่สำเร็จ กำลังพาไปหน้าเข้าสู่ระบบ...
            </p>
          ) : !token ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">
              ลิงก์ไม่ถูกต้อง — กรุณาขอลิงก์รีเซ็ตใหม่
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type={showPw ? "text" : "password"} required minLength={8}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] py-3 pl-10 pr-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]/60"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-sm text-[var(--text-primary)]">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 bal-btn font-semibold text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                ตั้งรหัสผ่านใหม่
              </button>
            </form>
          )}

          <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
            <Link href="/auth/signin" className="text-[var(--text-primary)] hover:underline">กลับไปเข้าสู่ระบบ</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
