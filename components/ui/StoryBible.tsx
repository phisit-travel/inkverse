"use client";

import { useState } from "react";
import { Users, Globe2, Clock, StickyNote, Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import type { ComponentType } from "react";

interface Entry {
  id: string;
  category: string;
  title: string;
  body: string | null;
}

const CATS: { key: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: "CHARACTER", label: "ตัวละคร", icon: Users },
  { key: "WORLD", label: "โลก & สถานที่", icon: Globe2 },
  { key: "TIMELINE", label: "ไทม์ไลน์", icon: Clock },
  { key: "NOTE", label: "โน้ตอื่นๆ", icon: StickyNote },
];

export default function StoryBible({ mangaSlug, initial }: { mangaSlug: string; initial: Entry[] }) {
  const [entries, setEntries] = useState<Entry[]>(initial);
  const [cat, setCat] = useState("CHARACTER");
  const [editing, setEditing] = useState<string | null>(null); // entry id, or "new"
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const list = entries.filter((e) => e.category === cat);
  const base = `/api/manga/${encodeURIComponent(mangaSlug)}/bible`;

  function startNew() {
    setEditing("new");
    setDraftTitle("");
    setDraftBody("");
    setError("");
  }
  function startEdit(e: Entry) {
    setEditing(e.id);
    setDraftTitle(e.title);
    setDraftBody(e.body ?? "");
    setError("");
  }
  function cancel() {
    setEditing(null);
    setError("");
  }

  async function save() {
    const title = draftTitle.trim();
    if (!title) { setError("ต้องระบุชื่อ"); return; }
    setBusy(true);
    setError("");
    try {
      if (editing === "new") {
        const res = await fetch(base, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: cat, title, body: draftBody }),
        });
        if (!res.ok) throw new Error();
        const created: Entry = await res.json();
        setEntries((p) => [...p, created]);
      } else if (editing) {
        const res = await fetch(`${base}/${editing}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body: draftBody }),
        });
        if (!res.ok) throw new Error();
        const updated: Entry = await res.json();
        setEntries((p) => p.map((e) => (e.id === updated.id ? updated : e)));
      }
      setEditing(null);
    } catch {
      setError("บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("ลบโน้ตนี้?")) return;
    setBusy(true);
    try {
      const res = await fetch(`${base}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setEntries((p) => p.filter((e) => e.id !== id));
      if (editing === id) setEditing(null);
    } catch {
      setError("ลบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const form = (
    <div className="border border-[var(--text-primary)]/40 bg-[var(--bg-surface)] p-3">
      <input
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        placeholder="ชื่อ (เช่น ชื่อตัวละคร / สถานที่ / เหตุการณ์)"
        autoFocus
        className="w-full bg-[var(--bg-card)] border border-[var(--border)] px-3 py-2 text-[var(--text-primary)] text-sm mb-2"
      />
      <textarea
        value={draftBody}
        onChange={(e) => setDraftBody(e.target.value)}
        rows={5}
        placeholder="รายละเอียด... (ลักษณะนิสัย, ความสัมพันธ์, กฎของโลก, เหตุการณ์สำคัญ ฯลฯ)"
        className="w-full bg-[var(--bg-card)] border border-[var(--border)] px-3 py-2 text-[var(--text-primary)] text-sm resize-y leading-relaxed"
      />
      {error && <p className="text-xs text-[var(--text-primary)] mt-1">{error}</p>}
      <div className="flex items-center gap-2 mt-2">
        <button onClick={save} disabled={busy} className="px-3 py-1.5 bal-btn text-xs font-semibold flex items-center gap-1.5">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} บันทึก
        </button>
        <button onClick={cancel} disabled={busy} className="px-3 py-1.5 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs flex items-center gap-1.5">
          <X className="w-3.5 h-3.5" /> ยกเลิก
        </button>
      </div>
    </div>
  );

  return (
    <div className="mt-6">
      {/* category tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATS.map((c) => {
          const active = c.key === cat;
          const n = entries.filter((e) => e.category === c.key).length;
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={() => { setCat(c.key); setEditing(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 border text-sm transition-colors ${active ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]" : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/40"}`}
            >
              <Icon className="w-4 h-4" /> {c.label}
              {n > 0 && <span className={`text-[10px] tabular-nums ${active ? "opacity-80" : "text-[var(--text-muted)]"}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      {/* add button */}
      {editing !== "new" && (
        <button onClick={startNew} className="w-full mb-3 px-3 py-2.5 border border-dashed border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/40 flex items-center justify-center gap-1.5">
          <Plus className="w-4 h-4" /> เพิ่มโน้ตใน{CATS.find((c) => c.key === cat)?.label}
        </button>
      )}
      {editing === "new" && <div className="mb-3">{form}</div>}

      {/* entries */}
      {list.length === 0 && editing !== "new" ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-8">ยังไม่มีโน้ตในหมวดนี้</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((e) =>
            editing === e.id ? (
              <div key={e.id}>{form}</div>
            ) : (
              <div key={e.id} className="border border-[var(--border)] bg-[var(--bg-surface)] p-3 group">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{e.title}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(e)} className="w-7 h-7 flex items-center justify-center border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="แก้ไข"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(e.id)} className="w-7 h-7 flex items-center justify-center border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="ลบ"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {e.body && <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 whitespace-pre-line leading-relaxed">{e.body}</p>}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
