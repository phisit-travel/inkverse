import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Eye, Users, Unlock, Coins, MessageSquare, Bookmark, TrendingDown } from "lucide-react";
import { decodeSlug } from "@/lib/slug";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const manga = await prisma.manga.findUnique({ where: { slug }, select: { title: true } });
  return { title: manga ? `สถิติ — ${manga.title}` : "สถิติ" };
}

const baht = (n: number) => `฿${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function MangaAnalyticsPage({ params }: Props) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user) redirect("/auth/signin");
  if (role !== "TRANSLATOR" && role !== "ADMIN") redirect("/");

  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const userId = (session.user as { id: string }).id;

  const manga = await prisma.manga.findUnique({
    where: { slug },
    include: {
      translator: { select: { userId: true } },
      chapters: {
        orderBy: { chapterNum: "asc" },
        select: { id: true, chapterNum: true, title: true, status: true, isPremium: true, viewCount: true },
      },
      _count: { select: { bookmarks: true } },
    },
  });
  if (!manga) notFound();
  if (role !== "ADMIN" && manga.translator?.userId !== userId) redirect("/dashboard");

  const ids = manga.chapters.map((c) => c.id);

  // Per-chapter aggregates (one grouped query each, then merged by chapterId).
  const [readers, unlocks, earnings, comments] = ids.length
    ? await Promise.all([
        prisma.readHistory.groupBy({ by: ["chapterId"], where: { chapterId: { in: ids } }, _count: { _all: true } }),
        prisma.unlockedChapter.groupBy({ by: ["chapterId"], where: { chapterId: { in: ids } }, _count: { _all: true } }),
        prisma.translatorEarning.groupBy({ by: ["chapterId"], where: { mangaId: manga.id, type: "UNLOCK" }, _sum: { amount: true } }),
        prisma.comment.groupBy({ by: ["chapterId"], where: { chapterId: { in: ids } }, _count: { _all: true } }),
      ])
    : [[], [], [], []];

  const readerMap = new Map(readers.map((r) => [r.chapterId, r._count._all]));
  const unlockMap = new Map(unlocks.map((u) => [u.chapterId, u._count._all]));
  const earnMap = new Map(earnings.map((e) => [e.chapterId, e._sum.amount ?? 0]));
  const commentMap = new Map(comments.map((c) => [c.chapterId, c._count._all]));

  const rows = manga.chapters.map((ch) => ({
    ...ch,
    readers: readerMap.get(ch.id) ?? 0,
    unlocks: unlockMap.get(ch.id) ?? 0,
    revenue: earnMap.get(ch.id) ?? 0,
    comments: commentMap.get(ch.id) ?? 0,
  }));

  const totals = rows.reduce(
    (a, r) => ({
      views: a.views + r.viewCount,
      readers: a.readers + r.readers,
      unlocks: a.unlocks + r.unlocks,
      revenue: a.revenue + r.revenue,
      comments: a.comments + r.comments,
    }),
    { views: 0, readers: 0, unlocks: 0, revenue: 0, comments: 0 }
  );

  // Retention curve: readers per chapter vs the first chapter.
  const firstReaders = rows[0]?.readers ?? 0;
  const peakReaders = Math.max(1, ...rows.map((r) => r.readers));

  const summary = [
    { icon: Eye, label: "ยอดวิวรวม", value: totals.views.toLocaleString() },
    { icon: Users, label: "นักอ่าน (ครั้ง)", value: totals.readers.toLocaleString() },
    { icon: Unlock, label: "ปลดล็อก", value: totals.unlocks.toLocaleString() },
    { icon: Coins, label: "รายได้รวม", value: baht(totals.revenue) },
    { icon: MessageSquare, label: "คอมเมนต์", value: totals.comments.toLocaleString() },
    { icon: Bookmark, label: "ติดตาม", value: manga._count.bookmarks.toLocaleString() },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link href={`/dashboard/manga/${slug}/chapters`} className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4">
        <ArrowLeft className="w-4 h-4" /> กลับไปจัดการตอน
      </Link>

      <p className="eyebrow text-[var(--text-secondary)]">ANALYTICS</p>
      <h1 className="font-bebas text-4xl text-[var(--text-primary)] tracking-wider">สถิติ · {manga.title}</h1>
      <p className="text-sm text-[var(--text-secondary)] mt-1">ภาพรวมยอดอ่าน รายได้ และจุดที่คนอ่านหลุดของแต่ละตอน</p>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
        {summary.map((s) => (
          <div key={s.label} className="bg-[var(--bg-surface)] border border-[var(--border)] p-4">
            <s.icon className="w-4 h-4 text-[var(--text-secondary)]" />
            <p className="font-bebas text-3xl text-[var(--text-primary)] tracking-wider mt-1">{s.value}</p>
            <p className="text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">{s.label}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] mt-10 text-center">ยังไม่มีตอน — เริ่มเขียนแล้วสถิติจะขึ้นที่นี่</p>
      ) : (
        <>
          {/* Retention curve */}
          <div className="mt-10">
            <h2 className="lux-title"><TrendingDown className="w-4 h-4" /> การคงอยู่ของผู้อ่าน (Retention)</h2>
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-4">
              <div className="flex items-end gap-1 h-40">
                {rows.map((r) => {
                  const h = Math.round((r.readers / peakReaders) * 100);
                  return (
                    <div key={r.id} className="flex-1 min-w-[3px] flex flex-col items-center justify-end group relative" title={`ตอน ${r.chapterNum}: ${r.readers} ครั้ง`}>
                      <div className="w-full bg-[var(--text-primary)] transition-all" style={{ height: `${Math.max(2, h)}%` }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-2">
                <span>ตอน {rows[0].chapterNum}</span>
                {firstReaders > 0 && rows.length > 1 && (
                  <span>คงอยู่ตอนล่าสุด: {Math.round(((rows[rows.length - 1].readers) / firstReaders) * 100)}%</span>
                )}
                <span>ตอน {rows[rows.length - 1].chapterNum}</span>
              </div>
            </div>
          </div>

          {/* Per-chapter table */}
          <div className="mt-10">
            <h2 className="lux-title">รายตอน</h2>
            <div className="overflow-x-auto border border-[var(--border)]">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-[var(--bg-surface)] text-[var(--text-secondary)] text-[11px] uppercase tracking-wide">
                    <th className="text-left font-medium px-3 py-2.5">ตอน</th>
                    <th className="text-right font-medium px-3 py-2.5">วิว</th>
                    <th className="text-right font-medium px-3 py-2.5">นักอ่าน</th>
                    <th className="text-right font-medium px-3 py-2.5">ปลดล็อก</th>
                    <th className="text-right font-medium px-3 py-2.5">รายได้</th>
                    <th className="text-right font-medium px-3 py-2.5">คอมเมนต์</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2.5">
                        <span className="text-[var(--text-primary)] font-medium">ตอน {r.chapterNum}</span>
                        {r.title && <span className="text-[var(--text-secondary)]"> · {r.title}</span>}
                        {r.status === "DRAFT" && <span className="ml-1.5 text-[9px] px-1 py-0.5 border border-[var(--border)] text-[var(--text-muted)] uppercase">ร่าง</span>}
                        {r.isPremium && <span className="ml-1.5 text-[9px] px-1 py-0.5 border border-[var(--text-primary)]/40 text-[var(--text-primary)] uppercase">พรีเมียม</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">{r.viewCount.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">{r.readers.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">{r.unlocks.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)] font-medium">{r.revenue > 0 ? baht(r.revenue) : "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">{r.comments.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-2">รายได้ = ส่วนแบ่งนักเขียนหลังหักค่าธรรมเนียมแพลตฟอร์ม · "นักอ่าน" นับจากประวัติการอ่าน</p>
          </div>
        </>
      )}
    </div>
  );
}
