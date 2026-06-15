import MangaCardSkeleton from "@/components/ui/MangaCardSkeleton";

// Instant skeleton while a creator/reader profile renders.
export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-[var(--bg-surface)] animate-pulse shrink-0" />
        <div className="space-y-2">
          <div className="h-6 w-40 bg-[var(--bg-surface)] rounded animate-pulse" />
          <div className="h-4 w-24 bg-[var(--bg-surface)] rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <MangaCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
