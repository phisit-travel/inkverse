import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";
import { resolveOwnedManga } from "@/lib/mangaOwner";
import { rateLimit } from "@/lib/rate-limit";

const CATEGORIES = ["CHARACTER", "WORLD", "TIMELINE", "NOTE"];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await resolveOwnedManga(slug);
  if ("err" in r) return r.err;
  const entries = await prisma.storyBibleEntry.findMany({
    where: { mangaId: r.manga.id },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await resolveOwnedManga(slug);
  if ("err" in r) return r.err;
  if (!rateLimit(`bible:${r.userId}`, 60, 60_000).ok) return apiError("RATE-001", 429);

  const body = await req.json().catch(() => ({}));
  const category = CATEGORIES.includes(body.category) ? body.category : "CHARACTER";
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) return apiError("VAL-001", 400, { message: "ต้องระบุชื่อ" });
  const text = typeof body.body === "string" ? body.body.slice(0, 20000) : "";

  const entry = await prisma.storyBibleEntry.create({
    data: { mangaId: r.manga.id, category, title, body: text || null },
  });
  return NextResponse.json(entry, { status: 201 });
}
