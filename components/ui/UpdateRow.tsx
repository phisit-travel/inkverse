import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import clsx from "clsx";

interface UpdateRowProps {
  slug: string;
  title: string;
  coverUrl?: string | null;
  chapterNum: number;
  chapterTitle?: string | null;
  publishedAt: Date | string;
  isPremium?: boolean;
  type?: string;
}

export default function UpdateRow({
  slug,
  title,
  coverUrl,
  chapterNum,
  chapterTitle,
  publishedAt,
  isPremium,
  type,
}: UpdateRowProps) {
  const timeAgo = formatDistanceToNow(new Date(publishedAt), {
    addSuffix: true,
    locale: th,
  });

  return (
    <Link
      href={`/content/${slug}/${chapterNum}`}
      className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
    >
      <div className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-[#1a1e2a]">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="48px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1e2a] to-[#141720]">
            <span className="text-lg opacity-20">📖</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white line-clamp-1 group-hover:text-[#ff6b2b] transition-colors">
            {title}
          </p>
          {type && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-white/10 text-gray-400 flex-shrink-0 uppercase">
              {type}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className={clsx(
              "text-xs font-medium",
              isPremium ? "text-yellow-400" : "text-[#ff6b2b]"
            )}
          >
            {isPremium ? "🔒 " : ""}ตอนที่ {chapterNum}
            {chapterTitle ? ` — ${chapterTitle}` : ""}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{timeAgo}</p>
      </div>
    </Link>
  );
}
