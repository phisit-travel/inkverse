import MangaCardSkeleton from "@/components/ui/MangaCardSkeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="h-7 w-48 bg-[var(--bg-surface)] rounded animate-pulse mb-4" />
      <div className="h-10 w-full bg-[var(--bg-surface)] rounded-xl animate-pulse mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 18 }).map((_, i) => (
          <MangaCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
