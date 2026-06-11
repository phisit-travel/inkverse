"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Lock, Unlock, Check } from "lucide-react";
import UnlockModal from "./UnlockModal";

interface ChapterRowProps {
  id: string;
  chapterNum: number;
  title?: string | null;
  isPremium: boolean;
  coinCost: number;
  publishedAt: string;
  viewCount: number;
  isUnlocked: boolean;
  isRead?: boolean;
  mangaSlug: string;
  userCoins: number;
  isLoggedIn: boolean;
}

export default function ChapterRow({
  id,
  chapterNum,
  title,
  isPremium,
  coinCost,
  publishedAt,
  viewCount,
  isUnlocked,
  isRead = false,
  mangaSlug,
  userCoins,
  isLoggedIn,
}: ChapterRowProps) {
  const [showModal, setShowModal] = useState(false);

  const canRead = !isPremium || isUnlocked;
  const href = `/content/${mangaSlug}/${chapterNum}`;

  function handleClick(e: React.MouseEvent) {
    if (!canRead) {
      e.preventDefault();
      if (!isLoggedIn) {
        window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(href)}`;
        return;
      }
      setShowModal(true);
    }
  }

  return (
    <>
      <Link
        href={href}
        onClick={handleClick}
        className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] bal-invert group"
      >
        <div className="flex items-center gap-3">
          {isPremium ? (
            isUnlocked ? (
              <Unlock className="w-4 h-4 text-[var(--text-primary)] flex-shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-[var(--text-primary)] flex-shrink-0" />
            )
          ) : null}

          <span
            className={`text-sm font-medium transition-colors ${
              isRead
                ? "text-[var(--text-secondary)]"
                : "text-[var(--text-primary)]"
            }`}
          >
            ตอนที่ {chapterNum}
            {title && (
              <span className="text-[var(--text-secondary)] font-normal ml-2">— {title}</span>
            )}
          </span>

          {isRead && (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-[var(--text-primary)] text-[var(--bg-primary)] font-semibold flex-shrink-0">
              <Check className="w-2.5 h-2.5" />
              อ่านแล้ว
            </span>
          )}

          {isPremium && !isUnlocked && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] flex-shrink-0">
              {coinCost} เหรียญ
            </span>
          )}
          {isPremium && isUnlocked && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] flex-shrink-0">
              ปลดล็อกแล้ว
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span>{new Date(publishedAt).toLocaleDateString("th-TH")}</span>
          <Eye className="w-3.5 h-3.5" />
          <span>{viewCount}</span>
        </div>
      </Link>

      {showModal && (
        <UnlockModal
          chapterId={id}
          chapterNum={chapterNum}
          coinCost={coinCost}
          userCoins={userCoins}
          mangaSlug={mangaSlug}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
