import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";
import { resolveOwnedChapter } from "@/lib/mangaOwner";

// Full revision content (for the editor's preview modal).
// NOTE: restore lives at ./restore (POST) — the path the editor calls.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; revId: string }> }) {
  const { id, revId } = await params;
  const r = await resolveOwnedChapter(id);
  if ("err" in r) return r.err;
  const rev = await prisma.chapterRevision.findUnique({ where: { id: revId } });
  if (!rev || rev.chapterId !== id) return apiError("READ-004", 404);
  return NextResponse.json(rev);
}
