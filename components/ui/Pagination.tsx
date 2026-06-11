import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Prev / next pagination that preserves the current query params (filters/sort).
 * Server component — build hrefs from the page's searchParams.
 */
export default function Pagination({
  page,
  totalPages,
  params = {},
}: {
  page: number;
  totalPages: number;
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const build = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `?${sp.toString()}`;
  };

  const base =
    "flex items-center gap-1.5 px-4 py-2.5 border text-sm font-semibold transition-colors";
  const on = "border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] hover:border-[var(--text-primary)]/50";
  const off = "border-[var(--border)] text-[var(--text-muted)] opacity-40 cursor-default";

  return (
    <div className="flex items-center justify-center gap-3 mt-10">
      {page > 1 ? (
        <Link href={build(page - 1)} className={`${base} ${on}`}>
          <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
        </Link>
      ) : (
        <span className={`${base} ${off}`}>
          <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
        </span>
      )}

      <span className="text-sm text-[var(--text-secondary)] tabular-nums">
        หน้า {page} / {totalPages}
      </span>

      {page < totalPages ? (
        <Link href={build(page + 1)} className={`${base} ${on}`}>
          ถัดไป <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <span className={`${base} ${off}`}>
          ถัดไป <ChevronRight className="w-4 h-4" />
        </span>
      )}
    </div>
  );
}
