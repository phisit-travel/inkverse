"use client";

import { useState } from "react";
import { Send, Loader2, Check } from "lucide-react";

export default function ContactForm({
  defaultName = "",
  defaultEmail = "",
}: {
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [form, setForm] = useState({
    name: defaultName,
    email: defaultEmail,
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const input =
    "w-full bg-[var(--bg-card)] border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]/60 transition-colors";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "ส่งไม่สำเร็จ กรุณาลองใหม่");
      }
    } catch {
      setError("ส่งไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center">
        <Check className="w-8 h-8 mx-auto mb-3 text-[var(--text-primary)]" />
        <p className="font-bebas text-2xl text-[var(--text-primary)] tracking-wider">ส่งข้อความแล้ว</p>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          ทีมงานจะติดต่อกลับทางอีเมลที่ให้ไว้โดยเร็วที่สุด
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">ชื่อ</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="ชื่อของคุณ"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">อีเมล (ติดต่อกลับ)</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@email.com"
            className={input}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">หัวข้อ (ไม่บังคับ)</span>
        <input
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          placeholder="เรื่องที่ต้องการติดต่อ"
          className={input}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">ข้อความ</span>
        <textarea
          required
          minLength={5}
          rows={6}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="รายละเอียดที่ต้องการแจ้งทีมงาน..."
          className={`${input} resize-y`}
        />
      </label>

      {error && <p className="text-sm text-[var(--text-primary)]">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto px-6 py-3 bal-btn text-sm font-semibold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        ส่งข้อความ
      </button>
    </form>
  );
}
