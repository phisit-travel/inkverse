import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOwnedChapter } from "@/lib/mangaOwner";

// List a chapter's saved revisions (metadata only — newest first).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await resolveOwnedChapter(id);
  if ("err" in r) return r.err;
  const revisions = await prisma.chapterRevision.findMany({
    where: { chapterId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, words: true, createdAt: true },
  });
  return NextResponse.json(revisions);
}
