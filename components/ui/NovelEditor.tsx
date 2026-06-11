"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bold, Italic, Heading2, Heading3, Quote, Minus, List, ListOrdered, Eye, Save, Loader2, Coins,
} from "lucide-react";

interface Existing {
  id: string;
  chapterNum: number;
  title: string | null;
  content: string | null;
  isPremium: boolean;
  coinCost: number;
}

export default function NovelEditor({
  mangaSlug,
  suggestedNum,
  existing,
}: {
  mangaSlug: string;
  suggestedNum: number;
  existing?: Existing | null;
}) {
  const router = useRouter();
  const draftKey = `novelDraft:${mangaSlug}:${existing?.id ?? "new"}`;
  const taRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.content ?? "");
  const [num, setNum] = useState(String(existing?.chapterNum ?? suggestedNum));
  const [isPremium, setIsPremium] = useState(existing?.isPremium ?? false);
  const [coinCost, setCoinCost] = useState(String(existing?.coinCost || 5));
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load any local draft (only for fields the user may have left unsaved).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.title) setTitle(d.title);
        if (d.body) setBody(d.body);
        if (d.num) setNum(d.num);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave draft.
  useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify({ title, body, num })); } catch { /* ignore */ }
    }, 600);
    return () => clearTimeout(id);
  }, [title, body, num, draftKey]);

  function apply(before: string, after = "", block = false) {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = body.slice(start, end);
    const insert = block ? `${before}${sel}` : `${before}${sel || ""}${after}`;
    const next = body.slice(0, start) + insert + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + before.length + (sel ? sel.length : 0);
      ta.setSelectionRange(pos, pos);
    });
  }

  const chars = body.replace(/\s+/g, "").length;
  const words = (body.replace(/[฀-๿]/g, " ").match(/\S+/g) || []).length + Math.ceil(((body.match(/[฀-๿]/g) || []).length) / 3);

  async function showPreview() {
    if (preview !== null) { setPreview(null); return; }
    try {
      const res = await fetch("/api/novel/preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: body }),
      });
      const d = await res.json();
      setPreview(d.html ?? "");
    } catch { setPreview("<p>พรีวิวไม่สำเร็จ</p>"); }
  }

  async function save() {
    setError("");
    const n = parseFloat(num);
    if (!Number.isFinite(n) || n < 0) { setError("เลขตอนไม่ถูกต้อง"); return; }
    if (!body.trim()) { setError("เนื้อหาว่างเปล่า"); return; }
    setSaving(true);
    try {
      const payload = { title: title.trim(), content: body, isPremium, coinCost: isPremium ? Math.max(1, parseInt(coinCost) || 1) : 0 };
      let res: Response;
      if (existing) {
        res = await fetch(`/api/chapters/${existing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, chapterNum: n }),
        });
      } else {
        res = await fetch(`/api/manga/${mangaSlug}/chapters`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapterNum: n, ...payload }),
        });
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "บันทึกไม่สำเร็จ");
        return;
      }
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      router.push(`/dashboard/manga/${mangaSlug}/chapters`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const btn = "w-9 h-9 flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg-card)] text-[var(--text-primary)]";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <p className="eyebrow text-[var(--text-secondary)]">{existing ? "แก้ไขตอน" : "เขียนตอนใหม่"}</p>
      <h1 className="font-bebas text-3xl text-[var(--text-primary)] tracking-wider mb-6">นิยาย · {mangaSlug}</h1>

      <div className="flex flex-wrap items-end gap-4 mb-4">
        <label className="text-sm">
          <span className="block text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">เลขตอน</span>
          <input value={num} onChange={(e) => setNum(e.target.value)} type="number" step="0.5" min="0"
            className="w-24 bg-[var(--bg-card)] border border-[var(--border)] px-3 py-2 text-[var(--text-primary)]" />
        </label>
        <label className="text-sm flex-1 min-w-[200px]">
          <span className="block text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">ชื่อตอน</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="(ไม่บังคับ)"
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] px-3 py-2 text-[var(--text-primary)]" />
        </label>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        <button onClick={() => apply("**", "**")} className={btn} title="ตัวหนา"><Bold className="w-4 h-4" /></button>
        <button onClick={() => apply("*", "*")} className={btn} title="ตัวเอียง"><Italic className="w-4 h-4" /></button>
        <button onClick={() => apply("## ", "", true)} className={btn} title="หัวข้อ"><Heading2 className="w-4 h-4" /></button>
        <button onClick={() => apply("### ", "", true)} className={btn} title="หัวข้อย่อย"><Heading3 className="w-4 h-4" /></button>
        <button onClick={() => apply("> ", "", true)} className={btn} title="อ้างอิง"><Quote className="w-4 h-4" /></button>
        <button onClick={() => apply("\n\n---\n\n", "", true)} className={btn} title="เส้นคั่นฉาก"><Minus className="w-4 h-4" /></button>
        <button onClick={() => apply("- ", "", true)} className={btn} title="ลิสต์"><List className="w-4 h-4" /></button>
        <button onClick={() => apply("1. ", "", true)} className={btn} title="ลิสต์เลข"><ListOrdered className="w-4 h-4" /></button>
        <button onClick={showPreview} className={`${btn} w-auto px-3 gap-1.5 ${preview !== null ? "bg-[var(--text-primary)] text-[var(--bg-primary)]" : ""}`} title="พรีวิว">
          <Eye className="w-4 h-4" /> พรีวิว
        </button>
      </div>

      {preview !== null ? (
        <div className="min-h-[400px] bg-[var(--bg-surface)] border border-[var(--border)] p-5 text-[var(--text-primary)]
          [&_p]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:my-3 [&_h3]:text-xl [&_h3]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--border)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_hr]:my-6 [&_hr]:border-[var(--border)] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
          dangerouslySetInnerHTML={{ __html: preview }} />
      ) : (
        <textarea ref={taRef} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="เริ่มเขียนเรื่องของคุณ... (กดปุ่มด้านบนเพื่อจัดรูปแบบ)"
          className="w-full min-h-[400px] bg-[var(--bg-card)] border border-[var(--border)] px-4 py-3 text-[var(--text-primary)] leading-relaxed resize-y focus:outline-none focus:border-[var(--text-primary)]/50" />
      )}

      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mt-2">
        <span>{words.toLocaleString()} คำ · {chars.toLocaleString()} ตัวอักษร · ~{Math.max(1, Math.round(words / 200))} นาที</span>
        <span className="opacity-60">บันทึกร่างอัตโนมัติ</span>
      </div>

      {/* premium */}
      <div className="mt-5 border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <button onClick={() => setIsPremium((v) => !v)} className="flex items-center gap-3 text-sm">
          <span className={`w-10 h-6 flex items-center px-0.5 transition-colors ${isPremium ? "bg-[var(--text-primary)] justify-end" : "bg-[var(--bg-card)] border border-[var(--border)]"}`}>
            <span className={`w-5 h-5 ${isPremium ? "bg-[var(--bg-primary)]" : "bg-[var(--text-secondary)]"}`} />
          </span>
          <span className="text-[var(--text-primary)] font-medium">ตอนพรีเมียม (ปลดด้วยเหรียญ)</span>
        </button>
        {isPremium && (
          <label className="flex items-center gap-2 mt-3 text-sm text-[var(--text-secondary)]">
            <Coins className="w-4 h-4 text-[var(--text-primary)]" /> ราคา
            <input value={coinCost} onChange={(e) => setCoinCost(e.target.value)} type="number" min="1"
              className="w-20 bg-[var(--bg-card)] border border-[var(--border)] px-2 py-1 text-[var(--text-primary)]" /> เหรียญ
          </label>
        )}
      </div>

      {error && <p className="text-sm text-[var(--text-primary)] mt-3">{error}</p>}

      <button onClick={save} disabled={saving}
        className="mt-5 w-full py-3 bal-btn font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {existing ? "บันทึกการแก้ไข" : "เผยแพร่ตอน"}
      </button>
    </div>
  );
}
