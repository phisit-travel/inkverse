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
  const [flip, setFlip] = useState<null | { dir: "next" | "prev"; from: number }>(null);
  const pct = Math.round((unlockedCount / items.length) * 100);

  const byCat = (c: number) => items.filter((i) => i.category === CATS[c].key);
  const countCat = (c: number) => {
    const list = byCat(c);
    return { done: list.filter((a) => a.unlocked).length, total: list.length };
  };

  const select = (c: number) => {
    if (c === cat || flip) return;
    const dir = c > cat ? "next" : "prev";
    setFlip({ dir, from: cat });
    setCat(c);
    window.setTimeout(() => setFlip(null), 600);
  };

  const ContentPage = ({ c }: { c: number }) => {
    const Icon = CATS[c].icon;
    return (
      <div className="absolute inset-0 bg-[var(--bg-surface)] overflow-y-auto p-4 sm:p-5"
        style={{ backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.10), transparent 12%)" }}>
        <h2 className="font-bebas text-2xl text-[var(--text-primary)] tracking-[0.15em] uppercase flex items-center gap-2 mb-3">
          <Icon className="w-5 h-5" /> {CATEGORY_LABEL[CATS[c].key]}
        </h2>
        <div className="flex flex-col gap-2">
          {byCat(c).map((a) => <AchRow key={a.key} a={a} />)}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Book */}
      <div className="relative rounded-2xl border-2 border-[var(--text-primary)]/25 bg-[var(--bg-card)] p-2 sm:p-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
        {/* emblem header */}
        <div className="flex items-center justify-center gap-2 py-2">
          <Star className="w-4 h-4 text-[var(--text-primary)]" />
          <span className="font-bebas text-xl tracking-[0.25em] text-[var(--text-primary)] uppercase">ความสำเร็จ</span>
          <Star className="w-4 h-4 text-[var(--text-primary)]" />
        </div>

        {/* inner frame */}
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:min-h-[460px]">
            {/* LEFT: contents / category tabs */}
            <div className="sm:w-[38%] bg-[var(--bg-surface)] border-b sm:border-b-0 sm:border-r border-[var(--text-primary)]/15 p-3 sm:p-4"
              style={{ backgroundImage: "linear-gradient(to left, rgba(0,0,0,0.08), transparent 14%)" }}>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)] mb-3 hidden sm:block">สารบัญ</p>
              {/* overall progress */}
              <div className="mb-3 p-2.5 rounded-lg border border-[var(--border)]">
                <div className="flex items-baseline justify-between">
                  <span className="font-bebas text-2xl text-[var(--text-primary)] tracking-wider">{unlockedCount}/{items.length}</span>
                  <span className="text-xs text-[var(--text-secondary)]">{pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--bg-primary)] border border-[var(--border)] overflow-hidden rounded-full mt-1.5">
                  <div className="h-full bg-[var(--text-primary)] transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {/* category tabs (dropbar on mobile = horizontal scroll) */}
              <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
                {CATS.map((cdef, i) => {
                  const { done, total } = countCat(i);
                  const active = i === cat;
                  const CIcon = cdef.icon;
                  return (
                    <button key={cdef.key} onClick={() => select(i)}
                      className={`shrink-0 sm:w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors ${active ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]" : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/40"}`}>
                      <CIcon className="w-4 h-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold leading-tight whitespace-nowrap">{CATEGORY_LABEL[cdef.key]}</span>
                        <span className={`block text-[10px] ${active ? "opacity-80" : "text-[var(--text-muted)]"}`}>{done}/{total} ปลดล็อก</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: content page with flip */}
            <div className="sm:w-[62%] relative" style={{ perspective: "2000px", minHeight: "320px" }}>
              <div className="relative w-full h-full min-h-[320px] sm:min-h-[460px]" style={{ transformStyle: "preserve-3d" }}>
                <ContentPage c={cat} />
                {flip && (
                  <div className="absolute inset-0"
                    style={{
                      transformStyle: "preserve-3d",
                      transformOrigin: flip.dir === "next" ? "left center" : "right center",
                      animation: `${flip.dir === "next" ? "achFlipNext" : "achFlipPrev"} 0.58s ease-in-out forwards`,
                      zIndex: 10,
                    }}>
                    <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}><ContentPage c={flip.from} /></div>
                    <div className="absolute inset-0 bg-[var(--bg-card)] border border-[var(--border)]"
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", backgroundImage: "linear-gradient(to left, rgba(0,0,0,0.12), transparent 18%)" }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] text-[var(--text-muted)] mt-3">แตะหมวดด้านข้างเพื่อพลิกดูความสำเร็จแต่ละหมวด</p>
    </div>
  );
}
