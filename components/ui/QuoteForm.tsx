"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";

const SERVICES = ["พิสูจน์อักษร & เกลาภาษา", "จัดเรียงหน้า"];

export default function QuoteForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [services, setServices] = useState<string[]>([SERVICES[0]]);
  const [wordCount, setWordCount] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  function toggle(s: string) {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) {
      setError("กรุณากรอกชื่อและช่องทางติดต่อ");
      return;
    }
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/services/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, services, wordCount, message }),
      });
      if (res.ok) setState("done");
      else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "ส่งไม่สำเร็จ กรุณาลองใหม่");
        setState("error");
      }
    } catch {
      setError("เครือข่ายขัดข้อง กรุณาลองใหม่");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center">
        <Check className="w-8 h-8 mx-auto mb-3 text-[var(--text-primary)]" />
        <h3 className="font-bebas text-2xl tracking-wider text-[var(--text-primary)] mb-2">ส่งคำขอแล้ว</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          เราได้รับคำขอใบเสนอราคาของคุณแล้ว จะติดต่อกลับทางช่องทางที่ให้ไว้โดยเร็วที่สุด
        </p>
      </div>
    );
  }

  const field =
    "w-full bg-[var(--bg-card)] border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/50 transition-colors";

  return (
    <form onSubmit={submit} className="border border-[var(--border)] bg-[var(--bg-surface)] p-6 space-y-4">
      <div>
        <label className="block text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">ชื่อ *</label>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ / นามปากกา" />
      </div>
      <div>
        <label className="block text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">ช่องทางติดต่อ *</label>
        <input className={field} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="LINE / อีเมล / เบอร์โทร" />
      </div>
      <div>
        <label className="block text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">บริการที่สนใจ</label>
        <div className="flex flex-wrap gap-2">
          {SERVICES.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => toggle(s)}
              className={`px-3 py-1.5 text-sm border transition-colors ${
                services.includes(s)
                  ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]/50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">จำนวนคำโดยประมาณ</label>
        <input className={field} value={wordCount} onChange={(e) => setWordCount(e.target.value)} placeholder="เช่น 50,000 คำ (ถ้ายังไม่แน่ใจ เว้นว่างได้)" />
      </div>
      <div>
        <label className="block text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">รายละเอียด / ลิงก์ต้นฉบับ</label>
        <textarea className={`${field} min-h-[90px] resize-y`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="เล่ารายละเอียดงาน หรือแนบลิงก์ไฟล์/Google Doc" />
      </div>
      {error && <p className="text-sm text-[var(--text-primary)]">{error}</p>}
      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full bal-btn py-3 text-sm font-semibold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {state === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        ขอใบเสนอราคา (ฟรี)
      </button>
      <p className="text-[11px] text-[var(--text-muted)] text-center">ต้นฉบับของคุณเป็นความลับ — เราไม่เผยแพร่หรือนำไปใช้</p>
    </form>
  );
}
