import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import MangaCard from "@/components/ui/MangaCard";
import { BookMarked, History, Star, Calendar } from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `โปรไฟล์ ${username}` };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      bookmarks: {
        take: 12,
        orderBy: { createdAt: "desc" },
        include: {
          manga: {
            include: {
              chapters: { orderBy: { chapterNum: "desc" }, take: 1 },
              ratings: { select: { score: true } },
            },
          },
        },
      },
      readHistory: {
        take: 10,
        orderBy: { readAt: "desc" },
        include: {
          chapter: {
            include: {
              manga: { select: { title: true, slug: true, coverUrl: true } },
            },
          },
        },
      },
      ratings: true,
      _count: { select: { bookmarks: true, comments: true } },
    },
  });

  if (!user) notFound();

  const roleLabel: Record<string, { label: string; color: string }> = {
    READER: { label: "นักอ่าน", color: "text-[var(--text-secondary)]" },
    TRANSLATOR: { label: "นักแปล", color: "text-[#ff6b2b]" },
    ADMIN: { label: "ผู้ดูแลระบบ", color: "text-[#ff2d55]" },
  };

  const roleInfo = roleLabel[user.role];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile Header */}
      <div className="relative mb-8">
        <div className="h-32 rounded-2xl bg-gradient-to-r from-[#ff2d55]/20 via-[var(--bg-card)] to-[#ff6b2b]/20 border border-[var(--border)]" />
        <div className="flex items-end gap-4 px-6 -mt-10">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-[var(--bg-primary)] bg-[var(--bg-card)] flex-shrink-0">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.username}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-[var(--text-primary)] bg-gradient-to-br from-[#ff2d55] to-[#ff6b2b]">
                {user.username[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="pb-2">
            <h1 className="font-bebas text-3xl text-[var(--text-primary)] tracking-wider">
              {user.username}
            </h1>
            <p className={`text-sm font-medium ${roleInfo.color}`}>
              {roleInfo.label}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          {
            icon: BookMarked,
            label: "บุ๊กมาร์ก",
            value: user._count.bookmarks,
          },
          {
            icon: History,
            label: "ประวัติอ่าน",
            value: user.readHistory.length,
          },
          { icon: Star, label: "รีวิว", value: user.ratings.length },
          {
            icon: Calendar,
            label: "เข้าร่วม",
            value: new Date(user.createdAt).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "short",
            }),
          },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="bg-[var(--bg-surface)] rounded-xl p-4 border border-[var(--border)] text-center"
          >
            <Icon className="w-5 h-5 text-[#ff2d55] mx-auto mb-1" />
            <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
            <p className="text-xs text-[var(--text-secondary)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Bookmarks */}
      {user.bookmarks.length > 0 && (
        <section className="mb-10">
          <h2 className="font-bebas text-2xl text-[var(--text-primary)] tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-[#ff2d55] to-[#ff6b2b] rounded-full" />
            บุ๊กมาร์ก
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {user.bookmarks.map(({ manga }) => {
              const avgRating =
                manga.ratings.length > 0
                  ? manga.ratings.reduce((a, b) => a + b.score, 0) /
                    manga.ratings.length
                  : 0;
              return (
                <MangaCard
                  key={manga.id}
                  slug={manga.slug}
                  title={manga.title}
                  coverUrl={manga.coverUrl}
                  latestChapter={manga.chapters[0]?.chapterNum}
                  rating={avgRating}
                  status={manga.status}
                  type={manga.type}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Read history */}
      {user.readHistory.length > 0 && (
        <section>
          <h2 className="font-bebas text-2xl text-[var(--text-primary)] tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-[#ff2d55] to-[#ff6b2b] rounded-full" />
            ประวัติการอ่าน
          </h2>
          <div className="space-y-2">
            {user.readHistory.map((h) => (
              <div
                key={`${h.userId}-${h.chapterId}`}
                className="flex items-center gap-4 p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]"
              >
                <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-[var(--bg-card)] flex-shrink-0">
                  {h.chapter.manga.coverUrl && (
                    <Image
                      src={h.chapter.manga.coverUrl}
                      alt={h.chapter.manga.title}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
                    {h.chapter.manga.title}
                  </p>
                  <p className="text-xs text-[#ff6b2b]">
                    ตอนที่ {h.chapter.chapterNum}
                  </p>
                </div>
                <p className="text-xs text-[var(--text-secondary)] flex-shrink-0">
                  {new Date(h.readAt).toLocaleDateString("th-TH")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
