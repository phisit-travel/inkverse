"use client";

import { useState, useEffect } from "react";
import { Trash2, BookOpen, Download, Smartphone, WifiOff, ChevronDown } from "lucide-react";
import Link from "next/link";
import ReaderViewer from "./ReaderViewer";
import TextReader from "./TextReader";
import { getDownloads, removeDownload, isAppContext, type OfflineChapter } from "@/lib/offline";

// The offline library — used by both /downloads (menu entry) and /offline (the
// service-worker fallback). Reads saved chapters from localStorage and plays them
// from the persistent cache (no network needed), so however you land here when
// offline, your downloads are reachable.
export default function OfflineLibrary({ offlineNotice = false }: { offlineNotice?: boolean }) {
  const [list, setList] = useState<OfflineChapter[]>([]);
  const [reading, setReading] = useState<OfflineChapter | null>(null);
  const [inApp, setInApp] = useState(true);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setInApp(isAppContext());
    setList(getDownloads());
    setReady(true);
  }, []);

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

  const removeSeries = async (slug: string) => {
    const ids = list.filter((d) => d.mangaSlug === slug).map((d) => d.chapterId);
    for (const id of ids) await removeDownload(id);
    setList(getDownloads());
  };

  const toggle = (slug: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(slug)) n.delete(slug);
      else n.add(slug);
      return n;
    });

  if (!ready) return null;

  // Group saved chapters by series (newest series first), chapters ascending.
  const groups: { slug: string; title: string; cover?: string; chapters: OfflineChapter[] }[] = [];
  const idxBySlug = new Map<string, number>();
  for (const d of list) {
    let i = idxBySlug.get(d.mangaSlug);
    if (i === undefined) {
      i = groups.length;
      idxBySlug.set(d.mangaSlug, i);
      groups.push({ slug: d.mangaSlug, title: d.mangaTitle, cover: d.coverUrl, chapters: [] });
    }
    groups[i].chapters.push(d);
  }
  groups.forEach((g) => g.chapters.sort((a, b) => a.chapterNum - b.chapterNum));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {offlineNotice && (
        <div className="mb-5 flex items-center gap-2 text-xs text-[var(--text-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-surface)]">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span className="min-w-0">ออฟไลน์อยู่ — เปิดอ่านตอนที่ดาวน์โหลดไว้ได้</span>
          <a href="/" className="ml-auto text-[var(--text-primary)] underline shrink-0">
            หน้าแรก
          </a>
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        <WifiOff className="w-5 h-5 text-[var(--text-secondary)]" />
        <h1 className="font-bebas text-3xl tracking-wider text-[var(--text-primary)]">คลังออฟไลน์</h1>
      </div>

      {list.length > 0 ? (
        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g.slug} className="rounded-xl border border-[var(--border)] overflow-hidden">
              {/* Series header — cover (online) + title + count, tap to expand */}
              <div className="flex items-center gap-3 p-2.5 bg-[var(--bg-card)]">
                <button onClick={() => toggle(g.slug)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                  <span className="w-10 h-[3.25rem] rounded bg-[var(--bg-surface)] flex items-center justify-center shrink-0 overflow-hidden relative">
                    <BookOpen className="w-5 h-5 text-[var(--text-secondary)]" />
                    {g.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={g.cover}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[var(--text-primary)] truncate">
                      {g.title}
                    </span>
                    <span className="block text-xs text-[var(--text-secondary)]">
                      {g.chapters.length} ตอนที่โหลดไว้
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--text-secondary)] shrink-0 transition-transform ${
                      expanded.has(g.slug) ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <button
                  onClick={() => removeSeries(g.slug)}
                  className="p-2 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
                  aria-label="ลบทั้งเรื่อง"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {expanded.has(g.slug) && (
                <div className="divide-y divide-[var(--border)]/40 bg-[var(--bg-surface)]">
                  {g.chapters.map((d) => (
                    <div key={d.chapterId} className="flex items-center gap-2 px-3 py-2.5">
                      <button onClick={() => setReading(d)} className="flex-1 text-left min-w-0 truncate text-sm text-[var(--text-primary)]">
                        ตอนที่ {d.chapterNum}
                        <span className="text-xs text-[var(--text-secondary)]">
                          {" · "}
                          {d.type === "novel"
                            ? `นิยาย${d.minutes ? ` ~${d.minutes} นาที` : ""}`
                            : `${d.pages?.length ?? 0} หน้า`}
                        </span>
                      </button>
                      <button
                        onClick={() => remove(d.chapterId)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
                        aria-label="ลบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !inApp ? (
        <div className="text-center py-16 px-4 border border-[var(--border)] rounded-2xl bg-[var(--bg-surface)]">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)]">
            <Smartphone className="w-7 h-7" />
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
            คลังออฟไลน์ใช้ได้ในแอป / เพิ่มลงหน้าจอโฮม (iPhone) — ดาวน์โหลดตอนเก็บไว้อ่านตอนไม่มีเน็ต
          </p>
          <Link
            href="/download"
            className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-xl bal-btn text-sm font-semibold uppercase tracking-widest"
          >
            <Download className="w-4 h-4" />
            ดูวิธีติดตั้ง
          </Link>
        </div>
      ) : (
        <div className="text-center py-16 text-[var(--text-secondary)] text-sm">
          ยังไม่มีตอนที่ดาวน์โหลด — แตะปุ่ม <Download className="inline w-4 h-4" /> ในหน้าอ่าน
          (หรือ &ldquo;ดาวน์โหลดตอน&rdquo; ในหน้ามังงะ) เพื่อเก็บไว้อ่านออฟไลน์
        </div>
      )}
    </div>
  );
}
