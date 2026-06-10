"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { Mail, Loader2, Check } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
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
            ลืมรหัสผ่าน
          </h1>

          {sent ? (
            <div className="text-center space-y-3 py-4">
              <Check className="w-8 h-8 mx-auto text-[var(--text-primary)]" />
              <p className="text-sm text-[var(--text-secondary)]">
                ถ้ามีบัญชีที่ใช้อีเมลนี้ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปแล้ว
                กรุณาตรวจสอบกล่องจดหมาย
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="อีเมล"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] py-3 pl-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]/60"
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bal-btn font-semibold text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                ส่งลิงก์รีเซ็ต
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
