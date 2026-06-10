export default function MangaCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div
        className="w-full rounded-[10px] bg-[var(--bg-surface)] mb-2.5"
        style={{ aspectRatio: "3/4" }}
      />
      <div className="h-3 bg-[var(--bg-surface)] rounded mb-1.5 w-4/5" />
      <div className="h-3 bg-[var(--bg-surface)] rounded w-2/5" />
    </div>
  );
}
