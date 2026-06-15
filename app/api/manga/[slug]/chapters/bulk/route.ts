import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decodeSlug } from "@/lib/slug";

// Bulk-apply pricing / early-access to a range of chapters the user owns.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "TRANSLATOR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const manga = await prisma.manga.findUnique({ where: { slug } });
  if (!manga) return NextResponse.json({ error: "Manga not found" }, { status: 404 });
  if (role === "TRANSLATOR") {
    const userId = (session.user as { id: string }).id;
    const translator = await prisma.translator.findUnique({ where: { userId } });
    if (!translator || manga.translatorId !== translator.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const fromNum = Number(body.fromNum);
  const toNum = Number(body.toNum);
  if (!Number.isFinite(fromNum) || !Number.isFinite(toNum)) {
    return NextResponse.json({ error: "ช่วงตอนไม่ถูกต้อง" }, { status: 400 });
  }
  const lo = Math.min(fromNum, toNum);
  const hi = Math.max(fromNum, toNum);

  let data: Record<string, unknown>;
  if (body.mode === "free") {
    data = { isPremium: false, coinCost: 0, freeAt: null };
  } else if (body.mode === "premium") {
    const coinCost = Math.max(1, Math.min(999, Number(body.coinCost) || 2));
    const days = body.freeInDays == null ? null : Number(body.freeInDays);
    const freeAt = days && days > 0 ? new Date(Date.now() + days * 86400000) : null;
    data = { isPremium: true, coinCost, freeAt };
  } else {
    return NextResponse.json({ error: "mode ไม่ถูกต้อง" }, { status: 400 });
  }

  const result = await prisma.chapter.updateMany({
    where: { mangaId: manga.id, chapterNum: { gte: lo, lte: hi } },
    data,
  });

  return NextResponse.json({ count: result.count });
}
