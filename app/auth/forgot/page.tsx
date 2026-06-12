"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { Mail, Lock, KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Step 1 — ask for the email, server sends a 6-digit OTP.
  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStep(2); // always advance — never reveal if the email exists
    } finally {
      setLoading(false);
    }
  }

  // Step 2 — verify OTP + set the new password (entered twice).
  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัว");
      return;
    }
    if (password !== confirm) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
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

  const inputCls =
    "w-full bg-[var(--bg-card)] border border-[var(--border)] py-3 pl-10 pr-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]/60";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8"><Logo size="lg" href="/" /></div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-8">
          <h1 className="font-bebas text-3xl text-[var(--text-primary)] tracking-wider text-center mb-6 uppercase">
            {step === 1 ? "ลืมรหัสผ่าน" : "ตั้งรหัสผ่านใหม่"}
          </h1>

          {done ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">
              ตั้งรหัสผ่านใหม่สำเร็จ กำลังพาไปหน้าเข้าสู่ระบบ...
            </p>
          ) : step === 1 ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                กรอกอีเมลที่ใช้สมัคร เราจะส่งรหัส OTP 6 หลักไปให้
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="อีเมล"
                  className={inputCls}
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bal-btn font-semibold text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                ส่งรหัส OTP
              </button>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                เราส่งรหัส OTP ไปที่ <span className="text-[var(--text-primary)]">{email}</span> แล้ว
                (หมดอายุใน 10 นาที) กรอกรหัสและตั้งรหัสผ่านใหม่
              </p>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  inputMode="numeric" required value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="รหัส OTP 6 หลัก"
                  className={`${inputCls} tracking-[0.5em] font-mono`}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type={showPw ? "text" : "password"} required minLength={8}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)"
                  className={inputCls}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type={showPw ? "text" : "password"} required minLength={8}
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                  className={inputCls}
                />
              </div>
              {error && <p className="text-sm text-[var(--text-primary)]">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 bal-btn font-semibold text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                ตั้งรหัสผ่านใหม่
              </button>
              <button type="button" onClick={() => { setStep(1); setOtp(""); setError(""); }}
                className="w-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                ไม่ได้รับรหัส? ส่งใหม่อีกครั้ง
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
