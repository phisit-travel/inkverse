import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, BookMarked } from "lucide-react";
import { decodeSlug } from "@/lib/slug";
import StoryBible from "@/components/ui/StoryBible";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const manga = await prisma.manga.findUnique({ where: { slug }, select: { title: true } });
  return { title: manga ? `สมุดโลก — ${manga.title}` : "สมุดโลก" };
}

export default async function StoryBiblePage({ params }: Props) {
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
      storyBible: { orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!manga) notFound();
  if (role !== "ADMIN" && manga.translator?.userId !== userId) redirect("/dashboard");

  const entries = manga.storyBible.map((e) => ({
    id: e.id,
    category: e.category,
    title: e.title,
    body: e.body,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link href={`/dashboard/manga/${slug}/chapters`} className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4">
        <ArrowLeft className="w-4 h-4" /> กลับไปจัดการตอน
      </Link>

      <p className="eyebrow text-[var(--text-secondary)]">STORY BIBLE</p>
      <h1 className="font-bebas text-4xl text-[var(--text-primary)] tracking-wider flex items-center gap-2">
        <BookMarked className="w-7 h-7" /> สมุดโลก · {manga.title}
      </h1>
      <p className="text-sm text-[var(--text-secondary)] mt-1">
        โน้ตส่วนตัวสำหรับเขียนเรื่อง — ตัวละคร โลก ไทม์ไลน์ ไม่แสดงให้คนอ่านเห็น
      </p>

      <StoryBible mangaSlug={slug} initial={entries} />
    </div>
  );
}
