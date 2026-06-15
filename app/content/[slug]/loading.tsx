// Instant skeleton while the manga detail page renders (cover + info + chapters).
export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="skeleton w-40 sm:w-56 aspect-[2/3] rounded-xl shrink-0" />
        <div className="flex-1 space-y-4">
          <div className="h-8 w-2/3 bg-[var(--bg-surface)] rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-[var(--bg-surface)] rounded animate-pulse" />
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full bg-[var(--bg-surface)] rounded animate-pulse" />
            <div className="h-3 w-full bg-[var(--bg-surface)] rounded animate-pulse" />
            <div className="h-3 w-4/5 bg-[var(--bg-surface)] rounded animate-pulse" />
          </div>
          <div className="flex gap-3 pt-2">
            <div className="h-10 w-32 bg-[var(--bg-surface)] rounded-xl animate-pulse" />
            <div className="h-10 w-24 bg-[var(--bg-surface)] rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
      <div className="mt-10 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 bg-[var(--bg-surface)] rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
