import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);

  if (!q || q.length < 1) {
    return NextResponse.json({ data: [] });
  }

  const mangas = await prisma.manga.findMany({
    where: {
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
      ],
    },
    take: limit,
    orderBy: { totalViews: "desc" },
    include: {
      genres: { include: { genre: { select: { name: true } } } },
      chapters: { orderBy: { chapterNum: "desc" }, take: 1, select: { chapterNum: true } },
    },
  });

  return NextResponse.json({
    data: mangas.map((m) => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      coverUrl: m.coverUrl,
      type: m.type,
      status: m.status,
      totalViews: m.totalViews,
      latestChapter: m.chapters[0]?.chapterNum ?? null,
      genres: m.genres.map((g) => g.genre.name),
    })),
  });
}
