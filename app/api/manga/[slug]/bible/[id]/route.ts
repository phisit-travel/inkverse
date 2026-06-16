import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";
import { resolveOwnedManga } from "@/lib/mangaOwner";

const CATEGORIES = ["CHARACTER", "WORLD", "TIMELINE", "NOTE"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const r = await resolveOwnedManga(slug);
  if ("err" in r) return r.err;

  const existing = await prisma.storyBibleEntry.findUnique({ where: { id }, select: { mangaId: true } });
  if (!existing || existing.mangaId !== r.manga.id) return apiError("READ-004", 404);

  const body = await req.json().catch(() => ({}));
  const data: { category?: string; title?: string; body?: string | null; sortOrder?: number } = {};
  if (CATEGORIES.includes(body.category)) data.category = body.category;
  if (typeof body.title === "string") {
    const t = body.title.trim().slice(0, 200);
    if (t) data.title = t;
  }
  if (typeof body.body === "string") data.body = body.body.slice(0, 20000) || null;
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) data.sortOrder = body.sortOrder;

  const updated = await prisma.storyBibleEntry.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const r = await resolveOwnedManga(slug);
  if ("err" in r) return r.err;

  const existing = await prisma.storyBibleEntry.findUnique({ where: { id }, select: { mangaId: true } });
  if (!existing || existing.mangaId !== r.manga.id) return apiError("READ-004", 404);

  await prisma.storyBibleEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
