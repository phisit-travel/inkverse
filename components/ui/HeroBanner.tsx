import Link from "next/link";
import Image from "next/image";
import { Star, Eye, BookOpen, Play } from "lucide-react";

interface HeroBannerProps {
  title: string;
  description: string;
  coverUrl?: string | null;
  slug: string;
  genres?: string[];
  rating?: number;
  latestChapter?: number;
}

export default function HeroBanner({
  title,
  description,
  coverUrl,
  slug,
  genres = [],
  rating,
  latestChapter,
}: HeroBannerProps) {
  return (
    <section className="relative mb-12 overflow-hidden h-80 sm:h-96 lg:h-[480px] border border-[var(--border)]">
      {/* Background */}
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={title}
          fill
          unoptimized
          className="object-cover opacity-40 grayscale"
          priority
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-surface)] to-[var(--bg-card)]" />
      )}

      {/* Clean editorial scrims (no glow — pure ink) */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-primary)]/85 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />

      {/* Couture inset frame */}
      <div className="absolute inset-4 sm:inset-6 border border-[var(--text-primary)]/15 pointer-events-none" />

      {/* Content */}
      <div className="relative h-full flex items-end pb-10 px-8 sm:px-12 lg:px-16 max-w-3xl">
        <div>
          {/* Eyebrow + genres */}
          <p className="eyebrow mb-4">
            FEATURED{genres.length ? ` · ${genres.slice(0, 3).join(" · ")}` : ""}
          </p>

          {/* Title */}
          <h1 className="font-bebas text-5xl sm:text-6xl lg:text-7xl text-[var(--text-primary)] tracking-[0.04em] leading-[0.9] mb-3 uppercase">
            {title}
          </h1>

          {/* Description */}
          <p className="text-sm sm:text-base text-[var(--text-secondary)] line-clamp-2 mb-5 max-w-lg leading-relaxed">
            {description}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-5 mb-6 text-xs text-[var(--text-secondary)] uppercase tracking-[0.15em]">
            {rating !== undefined && rating > 0 && (
              <span className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-[var(--text-primary)] text-[var(--text-primary)]" />
                {rating.toFixed(1)}
              </span>
            )}
            {latestChapter !== undefined && (
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                {latestChapter} ตอน
              </span>
            )}
          </div>

          {/* CTA buttons */}
          <div className="flex items-center gap-3">
            <Link
              href={`/content/${slug}`}
              className="flex items-center gap-2 px-7 py-3 bal-btn font-semibold text-xs uppercase tracking-[0.2em] hover:opacity-90"
            >
              <Play className="w-4 h-4 fill-current" />
              อ่านเลย
            </Link>
            <Link
              href={`/content/${slug}`}
              className="flex items-center gap-2 px-7 py-3 text-[var(--text-primary)] font-semibold text-xs uppercase tracking-[0.2em] border border-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-colors"
            >
              รายละเอียด
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
