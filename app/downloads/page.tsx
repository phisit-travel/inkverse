"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trash2, BookOpen, Download, Smartphone, WifiOff } from "lucide-react";
import ReaderViewer from "@/components/ui/ReaderViewer";
import TextReader from "@/components/ui/TextReader";
import { getDownloads, removeDownload, type OfflineChapter } from "@/lib/offline";

export default function DownloadsPage() {
  const [list, setList] = useState<OfflineChapter[]>([]);
  const [reading, setReading] = useState<OfflineChapter | null>(null);
  const [inApp, setInApp] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setInApp(!!(window as unknown as { Capacitor?: unknown }).Capacitor);
    setList(getDownloads());
    setReady(true);
  }, []);

  // Offline reader — content comes from the persistent download cache /
  // localStorage (no network needed; the SW serves images from ink-downloads).
  if (reading) {
    return reading.type === "novel" ? (
      <TextReader
        html={reading.html || ""}
        chapterTitle={reading.chapterTitle}
        chapterNum={reading.chapterNum}
        mangaTitle={reading.mangaTitle}
        mangaSlug={reading.mangaSlug}
        prevChapter={null}
        nextChapter={null}
        minutes={reading.minutes}
        authorNote={reading.authorNote}
        onBack={() => setReading(null)}
      />
    ) : (
      <ReaderViewer
        pages={(reading.pages || []).map((p, i) => ({
          pageNum: i + 1,
          src: `/api/img/${p.id}`,
          width: p.w,
          height: p.h,
        }))}
        chapterNum={reading.chapterNum}
        mangaSlug={reading.mangaSlug}
        prevChapter={null}
        nextChapter={null}
        onBack={() => setReading(null)}
      />
    );
  }

  const remove = async (id: string) => {
    await removeDownload(id);
    setList(getDownloads());
  };

  if (!ready) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <WifiOff className="w-5 h-5 text-[var(--text-secondary)]" />
        <h1 className="font-bebas text-3xl tracking-wider text-[var(--text-primary)]">
          คลังออฟไลน์
        </h1>
      </div>

      {!inApp ? (
        <div className="text-center py-16 px-4 border border-[var(--border)] rounded-2xl bg-[var(--bg-surface)]">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)]">
            <Smartphone className="w-7 h-7" />
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
            คลังออฟไลน์ใช้ได้เฉพาะใน <span className="text-[var(--text-primary)] font-semibold">แอป INKVERSE</span> —
            ดาวน์โหลดตอนเก็บไว้อ่านตอนไม่มีเน็ต
          </p>
          <Link
            href="/download"
            className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-xl bal-btn text-sm font-semibold uppercase tracking-widest"
          >
            <Download className="w-4 h-4" />
            โหลดแอป
          </Link>
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-secondary)] text-sm">
          ยังไม่มีตอนที่ดาวน์โหลด — แตะปุ่ม <Download className="inline w-4 h-4" /> ในหน้าอ่านเพื่อเก็บไว้อ่านออฟไลน์
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((d) => (
            <div
              key={d.chapterId}
              className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]"
            >
              <button
                onClick={() => setReading(d)}
                className="flex-1 flex items-center gap-3 text-left min-w-0"
              >
                <span className="w-10 h-10 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-[var(--text-secondary)]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--text-primary)] truncate">
                    {d.mangaTitle}
                  </span>
                  <span className="block text-xs text-[var(--text-secondary)]">
                    ตอนที่ {d.chapterNum} ·{" "}
                    {d.type === "novel"
                      ? `นิยาย${d.minutes ? ` · ~${d.minutes} นาที` : ""}`
                      : `${d.pages?.length ?? 0} หน้า`}
                  </span>
                </span>
              </button>
              <button
                onClick={() => remove(d.chapterId)}
                className="p-2 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
                aria-label="ลบ"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
