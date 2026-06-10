export default function MangaCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div
        className="w-full rounded-[10px] bg-[#141720] mb-2.5"
        style={{ aspectRatio: "3/4" }}
      />
      <div className="h-3 bg-[#141720] rounded mb-1.5 w-4/5" />
      <div className="h-3 bg-[#141720] rounded w-2/5" />
    </div>
  );
}
