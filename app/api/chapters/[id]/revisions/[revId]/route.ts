import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";
import { resolveOwnedChapter } from "@/lib/mangaOwner";
import { novelStats } from "@/lib/markdown";
import { revalidateMangaCache } from "@/lib/revalidate";

// Full revision content (for preview).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; revId: string }> }) {
  const { id, revId } = await params;
  const r = await resolveOwnedChapter(id);
  if ("err" in r) return r.err;
  const rev = await prisma.chapterRevision.findUnique({ where: { id: revId } });
  if (!rev || rev.chapterId !== id) return apiError("READ-004", 404);
  return NextResponse.json(rev);
}

// Restore this revision into the live chapter (snapshotting the current text
// first, so the restore is itself reversible).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; revId: string }> }) {
  const { id, revId } = await params;
  const r = await resolveOwnedChapter(id);
  if ("err" in r) return r.err;

  const rev = await prisma.chapterRevision.findUnique({ where: { id: revId } });
  if (!rev || rev.chapterId !== id) return apiError("READ-004", 404);

  const cur = await prisma.chapter.findUnique({
    where: { id },
    select: { title: true, content: true, authorNote: true },
  });
  if (cur?.content && cur.content !== rev.content) {
    await prisma.chapterRevision.create({
      data: { chapterId: id, title: cur.title, content: cur.content, authorNote: cur.authorNote, words: novelStats(cur.content).words },
    });
  }

  const updated = await prisma.chapter.update({
    where: { id },
    data: { content: rev.content, title: rev.title, authorNote: rev.authorNote },
    select: { content: true, title: true, authorNote: true },
  });

  // Keep only the 30 most recent revisions.
  const stale = await prisma.chapterRevision.findMany({
    where: { chapterId: id },
    orderBy: { createdAt: "desc" },
    skip: 30,
    select: { id: true },
  });
  if (stale.length) await prisma.chapterRevision.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });

  revalidateMangaCache(r.chapter.mangaSlug);
  return NextResponse.json({ ok: true, ...updated });
}
