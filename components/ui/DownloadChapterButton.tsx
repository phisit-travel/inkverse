"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Download, Check, Loader2, X, Smartphone } from "lucide-react";
import { downloadChapter, removeDownload, isDownloaded } from "@/lib/offline";

interface Props {
  chapterId: string;
  mangaSlug: string;
  chapterNum: number;
  mangaTitle: string;
  pages: { src: string; width?: number | null; height?: number | null }[];
}

// In the app: downloads the chapter for offline reading. On the web: the button
// still shows, but tapping it gently invites the visitor to get the app — a soft,
// non-blocking nudge to install (the offline feature is app-exclusive).
export default function DownloadChapterButton({
  chapterId,
  mangaSlug,
  chapterNum,
  mangaTitle,
  pages,
}: Props) {
  const [inApp, setInApp] = useState(false);
  const [state, setState] = useState<"idle" | "downloading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [invite, setInvite] = useState(false);

  useEffect(() => {
    setInApp(!!(window as unknown as { Capacitor?: unknown }).Capacitor);
    try {
      if (isDownloaded(chapterId)) setState("done");
    } catch {}
  }, [chapterId]);

  const onClick = async () => {
    if (!inApp) {
      setInvite(true);
      return;
    }
    if (state === "downloading") return;
    if (state === "done") {
      await removeDownload(chapterId);
      setState("idle");
      return;
    }
    setState("downloading");
    setProgress(0);
    try {
      await downloadChapter(
        { chapterId, mangaSlug, chapterNum, mangaTitle },
        pages,
        (d, t) => setProgress(Math.round((d / t) * 100))
      );
      setState("done");
    } catch {
      setState("idle");
      alert("ดาวน์โหลดไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  };

  return (
    <>
      <button
        onClick={onClick}
        title={state === "done" ? "ดาวน์โหลดแล้ว (แตะเพื่อลบ)" : "ดาวน์โหลดไว้อ่านออฟไลน์"}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-xs"
      >
        {state === "downloading" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{progress}%</span>
          </>
        ) : state === "done" ? (
          <Check className="w-4 h-4 text-[var(--text-primary)]" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </button>

      {/* Web-only soft upsell */}
      {invite && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
          onClick={() => setInvite(false)}
        >
          <div
            className="w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setInvite(false)}
              className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="ปิด"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)]">
              <Smartphone className="w-7 h-7" />
            </div>
            <h3 className="font-bebas text-2xl tracking-wider text-[var(--text-primary)]">
              อ่านออฟไลน์ได้ในแอป
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
              ดาวน์โหลดตอนเก็บไว้อ่านตอนเน็ตไม่มี/บนเครื่องบิน — ใช้ได้เฉพาะในแอป INKVERSE
              บน Android (ฟรี)
            </p>
            <Link
              href="/download"
              className="inline-flex items-center justify-center gap-2 mt-5 w-full py-3 rounded-xl bal-btn text-sm font-semibold uppercase tracking-widest"
            >
              <Download className="w-4 h-4" />
              โหลดแอป
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
