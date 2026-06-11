import { BadgeCheck, Feather, Sparkles } from "lucide-react";
import type { RankBadge } from "@/lib/ranks";

const KIND = {
  admin: { Icon: BadgeCheck, cls: "bg-[var(--text-primary)] text-[var(--bg-primary)] border-transparent" },
  translator: { Icon: Feather, cls: "bg-transparent text-[var(--text-primary)] border-[var(--text-primary)]/40" },
  reader: { Icon: Sparkles, cls: "bg-transparent text-[var(--text-secondary)] border-[var(--border)]" },
} as const;

/** Compact monochrome rank label — used next to names in the navbar & comments. */
export default function RankChip({
  badge,
  className = "",
}: {
  badge: RankBadge;
  className?: string;
}) {
  const { Icon, cls } = KIND[badge.kind];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[9px] font-semibold uppercase tracking-wide leading-none ${cls} ${className}`}
      title={badge.kind === "admin" ? "INKVERSE Official" : `${badge.nameEn} · LV.${badge.level}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {badge.kind === "admin" ? (
        "OFFICIAL"
      ) : (
        <>
          {badge.nameEn}
          <span className="opacity-60">LV.{badge.level}</span>
        </>
      )}
    </span>
  );
}
