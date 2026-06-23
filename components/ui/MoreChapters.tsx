"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import ChapterRow from "./ChapterRow";

interface Ch {
  id: string;
  chapterNum: number;
  title?: string | null;
  isPremium: boolean;
  coinCost: number;
  publishedAt: string;
  viewCount: number;
  isUnlocked: boolean;
  isRead?: boolean;
  freeAt?: string | null;
}

// Older chapters are kept OUT of the initial render (a long series can be 200+
// rows = a huge HTML payload on the title page). They mount only when the reader
// asks — keeping the landing page light while every chapter is still reachable.
export default function MoreChapters({
  chapters,
  mangaSlug,
  userCoins,
  isLoggedIn,
}: {
  chapters: Ch[];
  mangaSlug: string;
  userCoins: number;
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (chapters.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/50 transition-colors"
      >
        <ChevronDown className="w-4 h-4" />
        ดูอีก {chapters.length.toLocaleString()} ตอน
      </button>
    );
  }

  return (
    <>
      {chapters.map((ch) => (
        <ChapterRow
          key={ch.id}
          id={ch.id}
          chapterNum={ch.chapterNum}
          title={ch.title}
          isPremium={ch.isPremium}
          coinCost={ch.coinCost}
          publishedAt={ch.publishedAt}
          viewCount={ch.viewCount}
          isUnlocked={ch.isUnlocked}
          isRead={ch.isRead}
          mangaSlug={mangaSlug}
          userCoins={userCoins}
          isLoggedIn={isLoggedIn}
          freeAt={ch.freeAt}
        />
      ))}
    </>
  );
}
