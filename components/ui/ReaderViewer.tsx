"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Settings, AlignJustify, BookOpen } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

interface Page {
  pageNum: number;
  src: string; // signed proxy URL (/api/img/<id>?e=&s=)
  width?: number | null;
  height?: number | null;
}

interface ReaderViewerProps {
  pages: Page[];
  chapterNum: number;
  mangaSlug: string;
  prevChapter?: number | null;
  nextChapter?: number | null;
  onPageChange?: (page: number) => void;
  watermark?: string | null;
}

// Loads a manga page through the authenticated proxy as a blob, so the real
// image URL never appears in the DOM/HTML (a script can't grab src=). Lazy by
// default (loads ~1200px before it scrolls into view).
function ProtectedImage({
  src: source,
  alt,
  w,
  h,
  imgClassName,
  priority,
}: {
  src: string;
  alt: string;
  w: number;
  h: number;
  imgClassName: string;
  priority?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objUrl: string | null = null;
    let started = false;
    const load = async () => {
      if (started) return;
      started = true;
      try {
        const res = await fetch(source);
        if (!res.ok) return;
        const blob = await res.blob();
        objUrl = URL.createObjectURL(blob);
        setSrc(objUrl);
      } catch {
        /* ignore */
      }
    };

    let io: IntersectionObserver | null = null;
    if (priority) {
      load();
    } else {
      io = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            io?.disconnect();
            load();
          }
        },
        { rootMargin: "1200px" }
      );
      if (wrapRef.current) io.observe(wrapRef.current);
    }
    return () => {
      io?.disconnect();
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [source, priority]);

  return (
    <div ref={wrapRef} className="w-full" style={src ? undefined : { aspectRatio: `${w} / ${h}` }}>
      {src ? (
        <img
          src={src}
          alt={alt}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className={imgClassName}
        />
      ) : (
        <div className="skeleton w-full h-full" />
      )}
    </div>
  );
}

export default function ReaderViewer({
  pages,
  chapterNum,
  mangaSlug,
  prevChapter,
  nextChapter,
  onPageChange,
  watermark,
}: ReaderViewerProps) {
  const [mode, setMode] = useState<"webtoon" | "page">("webtoon");
  const [currentPage, setCurrentPage] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(pages.length - 1, idx));
      setCurrentPage(clamped);
      onPageChange?.(clamped + 1);
    },
    [pages.length, onPageChange]
  );

  useEffect(() => {
    if (mode !== "page") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goTo(currentPage + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goTo(currentPage - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, currentPage, goTo]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (mode !== "page" || touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goTo(currentPage + 1);
      else goTo(currentPage - 1);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  const progress = pages.length > 0 ? ((currentPage + 1) / pages.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href={`/content/${mangaSlug}`}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            กลับ
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">
              ตอนที่ {chapterNum}
              {mode === "page" && ` — ${currentPage + 1}/${pages.length}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(mode === "webtoon" ? "page" : "webtoon")}
              className="p-2 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title={mode === "webtoon" ? "เปลี่ยนเป็นโหมดหน้า" : "เปลี่ยนเป็นโหมด Webtoon"}
            >
              {mode === "webtoon" ? (
                <BookOpen className="w-4 h-4" />
              ) : (
                <AlignJustify className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {mode === "page" && (
          <div className="h-0.5 bg-white/10">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="fixed top-16 right-2 sm:right-4 z-50 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 w-64 max-w-[calc(100vw-1rem)] ">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">ตั้งค่าการอ่าน</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-1">
                ความสว่าง: {brightness}%
              </label>
              <input
                type="range"
                min={50}
                max={150}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] block mb-1">โหมดการอ่าน</label>
              <div className="flex gap-2">
                {(["webtoon", "page"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={clsx(
                      "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
                      mode === m
                        ? "bal-btn"
                        : "bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {m === "webtoon" ? "เลื่อน" : "หน้า"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Traceable watermark — a leaked screenshot carries the reader's name */}
      {watermark && (
        <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden select-none" aria-hidden="true">
          <div className="absolute inset-0 flex flex-wrap gap-x-16 gap-y-20 -rotate-[24deg] scale-150 opacity-[0.05]">
            {Array.from({ length: 80 }).map((_, i) => (
              <span key={i} className="text-[11px] whitespace-nowrap text-[var(--text-primary)]">{watermark}</span>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        ref={containerRef}
        style={{ filter: `brightness(${brightness}%)` }}
        className="max-w-4xl mx-auto select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        {mode === "webtoon" ? (
          <div className="flex flex-col items-center">
            {pages.map((page) => (
              <div key={page.pageNum} className="w-full relative">
                <ProtectedImage
                  src={page.src}
                  alt={`Page ${page.pageNum}`}
                  w={page.width || 800}
                  h={page.height || 1200}
                  imgClassName="w-full h-auto select-none"
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="relative min-h-screen flex items-center justify-center p-4"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {pages[currentPage] && (
              <ProtectedImage
                src={pages[currentPage].src}
                alt={`Page ${currentPage + 1}`}
                w={pages[currentPage].width || 800}
                h={pages[currentPage].height || 1200}
                imgClassName="max-h-[calc(100vh-120px)] w-auto object-contain mx-auto select-none"
                priority
              />
            )}

            {/* Nav buttons */}
            <button
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-[var(--text-primary)] disabled:opacity-20 hover:bg-black/80 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage === pages.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-[var(--text-primary)] disabled:opacity-20 hover:bg-black/80 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* Chapter navigation */}
      <div className="sticky bottom-0 bg-[var(--bg-primary)]/95 backdrop-blur border-t border-[var(--border)] p-3 sm:p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {prevChapter != null ? (
            <Link
              href={`/content/${mangaSlug}/${prevChapter}`}
              className="flex items-center gap-1.5 px-3 py-2.5 sm:px-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:border-white/30 transition-all"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">ตอนก่อน</span>
            </Link>
          ) : (
            <div className="w-10" />
          )}

          <span className="text-xs sm:text-sm text-[var(--text-secondary)] text-center">
            {mode === "page"
              ? `${currentPage + 1} / ${pages.length} หน้า`
              : `${pages.length} หน้า`}
          </span>

          {nextChapter != null ? (
            <Link
              href={`/content/${mangaSlug}/${nextChapter}`}
              className="flex items-center gap-1.5 px-3 py-2.5 sm:px-4 rounded-xl bg-[var(--accent)] text-sm text-[var(--text-primary)] hover:opacity-90 transition-all"
            >
              <span className="hidden sm:inline">ตอนถัดไป</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </Link>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>
    </div>
  );
}
