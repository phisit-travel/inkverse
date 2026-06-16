"use client";

import { useState } from "react";
import {
  BookOpen, BookText, Library, Flame, Crown, CheckCircle2, Trophy,
  Compass, Bookmark, Star, Unlock, Coins, Sparkles, Gem, Medal, Award,
  MessageSquare, Lock, Check,
} from "lucide-react";
import type { ComponentType } from "react";
import type { AchievementProgress, AchievementCategory } from "@/lib/achievements";

// Defined locally (not imported from lib/achievements) so this client component
// doesn't pull the server-only module (prisma, google-auth) into the bundle.
const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  reading: "การอ่าน",
  completion: "อ่านจบเรื่อง",
  social: "รีวิว & สังคม",
  engagement: "สนับสนุน & มีส่วนร่วม",
};

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  BookOpen, BookText, Library, Flame, Crown, CheckCircle2, Trophy,
  Compass, Bookmark, Star, Unlock, Coins, Sparkles, Gem, Medal, Award, MessageSquare,
};

const CATS: { key: AchievementCategory; icon: ComponentType<{ className?: string }> }[] = [
  { key: "reading", icon: BookOpen },
  { key: "completion", icon: CheckCircle2 },
  { key: "social", icon: MessageSquare },
  { key: "engagement", icon: Coins },
];

const FLIP_MS = 720;

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const map: Record<string, string> = {
    tl: "top-1.5 left-1.5 border-t border-l rounded-tl-lg",
    tr: "top-1.5 right-1.5 border-t border-r rounded-tr-lg",
    bl: "bottom-1.5 left-1.5 border-b border-l rounded-bl-lg",
    br: "bottom-1.5 right-1.5 border-b border-r rounded-br-lg",
  };
  return <span className={`pointer-events-none absolute w-6 h-6 border-[var(--text-primary)]/45 ${map[pos]}`} />;
}

function AchRow({ a }: { a: AchievementProgress }) {
  const Icon = ICONS[a.icon] ?? Trophy;
  const pct = Math.min(100, Math.round((a.current / a.threshold) * 100));
  return (
    <div className={`flex items-start gap-3 p-2.5 border rounded-lg ${a.unlocked ? "border-[var(--text-primary)]/45 bg-[var(--text-primary)]/[0.05]" : "border-[var(--border)]"}`}>
      <div className={`w-9 h-9 shrink-0 flex items-center justify-center rounded ${a.unlocked ? "bg-[var(--text-primary)] text-[var(--bg-primary)]" : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]"}`}>
        {a.unlocked ? <Icon className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">{a.title}</h3>
        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug line-clamp-1">{a.description}</p>
        {a.unlocked ? (
          <p className="text-[10px] text-[var(--text-primary)] mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> ปลดล็อกแล้ว</p>
        ) : (
          <div className="mt-1.5">
            <div className="flex justify-between text-[9px] text-[var(--text-secondary)] mb-0.5">
              <span>{a.current.toLocaleString()}/{a.threshold.toLocaleString()}</span><span>{pct}%</span>
            </div>
            <div className="h-1 w-full bg-[var(--bg-primary)] border border-[var(--border)] overflow-hidden rounded-full">
              <div className="h-full bg-[var(--text-primary)]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AchievementBook({ items, unlockedCount }: { items: AchievementProgress[]; unlockedCount: number }) {
  const [cat, setCat] = useState(0);
  const [flip, setFlip] = useState<null | { from: number }>(null);
  const pct = Math.round((unlockedCount / items.length) * 100);

  const byCat = (c: number) => items.filter((i) => i.category === CATS[c].key);
  const countCat = (c: number) => {
    const list = byCat(c);
    return { done: list.filter((a) => a.unlocked).length, total: list.length };
  };

  const select = (c: number) => {
    if (c === cat || flip) return;
    // Same realistic motion both ways: the new page swings in from the left
    // and closes over the old one, which stays beneath until covered.
    setFlip({ from: cat });
    setCat(c);
    window.setTimeout(() => setFlip(null), FLIP_MS);
  };

  // One open spread: the category's achievements split into two equal pages.
  const Spread = ({ c }: { c: number }) => {
    const Icon = CATS[c].icon;
    const list = byCat(c);
    const mid = Math.ceil(list.length / 2);
    const cols = [list.slice(0, mid), list.slice(mid)];
    return (
      <div className="absolute inset-0 bg-[var(--bg-surface)] overflow-y-auto">
        <h2 className="sticky top-0 z-[1] bg-[var(--bg-surface)] font-bebas text-2xl text-[var(--text-primary)] tracking-[0.18em] uppercase flex items-center justify-center gap-2 py-3 border-b border-[var(--border)]">
          <Icon className="w-5 h-5" /> {CATEGORY_LABEL[CATS[c].key]}
        </h2>
        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 p-4 sm:p-5">
          {/* page gutter shadows + centre spine line (desktop) */}
          <span className="pointer-events-none hidden sm:block absolute inset-y-3 left-1/2 -translate-x-1/2 w-px bg-[var(--text-primary)]/12" />
          <span className="pointer-events-none hidden sm:block absolute inset-y-0 left-1/2 w-6 -translate-x-full" style={{ background: "linear-gradient(to left, rgba(0,0,0,0.14), transparent)" }} />
          <span className="pointer-events-none hidden sm:block absolute inset-y-0 left-1/2 w-6" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.14), transparent)" }} />
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-2">
              {col.map((a) => <AchRow key={a.key} a={a} />)}
              {col.length === 0 && (
                <div className="flex-1 flex items-center justify-center opacity-[0.06] py-8"><Icon className="w-24 h-24" /></div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* ── Book cover ── */}
      <div className="relative rounded-2xl border border-[var(--text-primary)]/30 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-surface)] p-3 sm:p-4 shadow-[0_34px_80px_-28px_rgba(0,0,0,0.8)]">
        <div className="pointer-events-none absolute inset-2 rounded-xl border border-[var(--text-primary)]/15" />
        <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />

        {/* emblem + overall progress */}
        <div className="flex items-center justify-center gap-2.5 pt-1.5 pb-2">
          <span className="w-8 h-px bg-gradient-to-r from-transparent to-[var(--text-primary)]/60" />
          <Star className="w-3.5 h-3.5 text-[var(--text-primary)]" />
          <span className="font-bebas text-xl tracking-[0.3em] text-[var(--text-primary)] uppercase">ความสำเร็จ</span>
          <Star className="w-3.5 h-3.5 text-[var(--text-primary)]" />
          <span className="w-8 h-px bg-gradient-to-l from-transparent to-[var(--text-primary)]/60" />
        </div>
        <div className="max-w-xs mx-auto mb-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 bg-[var(--bg-primary)] border border-[var(--border)] overflow-hidden rounded-full">
            <div className="h-full bg-[var(--text-primary)] transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] tabular-nums shrink-0">{unlockedCount}/{items.length}</span>
        </div>

        {/* category tabs (bookmarks) */}
        <div className="flex justify-center gap-2 mb-3 overflow-x-auto pb-1">
          {CATS.map((cdef, i) => {
            const { done, total } = countCat(i);
            const active = i === cat;
            const CIcon = cdef.icon;
            return (
              <button key={cdef.key} onClick={() => select(i)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg rounded-b-sm border text-left transition-colors ${active ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]" : "bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/40"}`}>
                <CIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[12px] font-semibold whitespace-nowrap">{CATEGORY_LABEL[cdef.key]}</span>
                <span className={`text-[10px] tabular-nums ${active ? "opacity-80" : "text-[var(--text-muted)]"}`}>{done}/{total}</span>
              </button>
            );
          })}
        </div>

        {/* ── Open book (two equal pages) ── */}
        <div className="relative rounded-xl border border-[var(--border)] overflow-hidden" style={{ perspective: "2400px" }}>
          <div className="relative w-full min-h-[360px] sm:min-h-[460px]" style={{ transformStyle: "preserve-3d" }}>
            {/* old page stays beneath until the incoming page closes over it */}
            <Spread c={flip ? flip.from : cat} />
            {flip && (
              <div className="absolute inset-0"
                style={{
                  transformStyle: "preserve-3d",
                  transformOrigin: "left center",
                  animation: `achFlipPrevIn ${FLIP_MS}ms cubic-bezier(0.34, 0.05, 0.2, 1) forwards`,
                  boxShadow: "0 0 44px -6px rgba(0,0,0,0.55)",
                  zIndex: 10,
                }}>
                {/* leaf = the new page, swinging in from the left to close over the old */}
                <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
                  <Spread c={cat} />
                  <div className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(to right, rgba(0,0,0,0.55), transparent 42%)",
                      animation: `achLeafShade ${FLIP_MS}ms ease-in-out forwards`,
                    }} />
                </div>
                <div className="absolute inset-0 bg-[var(--bg-card)] border border-[var(--border)]"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", backgroundImage: "linear-gradient(to left, rgba(0,0,0,0.18), transparent 16%)" }} />
              </div>
            )}
          </div>
          {/* centre spine over the seam */}
          <div className="pointer-events-none hidden sm:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-5 z-20"
            style={{ background: "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.28) 38%, rgba(0,0,0,0.28) 62%, rgba(0,0,0,0) 100%)" }}>
            <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-[var(--text-primary)]/15" />
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] text-[var(--text-muted)] mt-3">แตะหมวดด้านบนเพื่อพลิกหน้าหนังสือ</p>
    </div>
  );
}
