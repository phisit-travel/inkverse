"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { useReadingProgress } from "./ReadingProgressProvider";
import { useLang } from "./LangProvider";
import { dict } from "@/lib/i18n";

export default function ContinueReading() {
  const { items, loaded } = useReadingProgress();
  const lang = useLang();
  const t = (k: keyof typeof dict.th) => dict[lang][k];

  if (!loaded || items.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="font-bebas text-2xl text-[var(--text-primary)] tracking-wider mb-4 flex items-center gap-2">
        <History className="w-5 h-5 text-[var(--text-primary)]" /> {t("continueReading")}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {items.map((it) => (
          <Link
            key={it.slug}
            href={`/content/${it.slug}/${it.chapterNum}`}
            className="shrink-0 w-28 group"
          >
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]">
              {it.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.coverUrl} alt={it.title} width={112} height={149} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">📖</div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pt-3 pb-1.5">
                <span className="text-[10px] text-[var(--text-primary)] font-medium">
                  {t("chapterPrefix")} {it.chapterNum}
                </span>
                {/* Progress bar */}
                <div className="h-1 w-full bg-white/25 mt-1 overflow-hidden rounded-full">
                  <div className="h-full bg-[var(--text-primary)]" style={{ width: `${it.percent}%` }} />
                </div>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1 group-hover:text-[var(--text-primary)] transition-colors">
              {it.title}
            </p>
            {/* Word order differs: Thai = "อ่านแล้ว 45%", English = "45% read" */}
            <p className="text-[10px] text-[var(--text-secondary)]">
              {lang === "en" ? `${it.percent}% read` : `อ่านแล้ว ${it.percent}%`}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
