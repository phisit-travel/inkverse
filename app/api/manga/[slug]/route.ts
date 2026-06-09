import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const manga = await prisma.manga.findUnique({
    where: { slug },
    include: {
      genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
      chapters: { orderBy: { chapterNum: "asc" } },
      ratings: { select: { score: true } },
      translator: {
        select: { penName: true, bio: true },
      },
    },
  });

  if (!manga) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const avgRating =
    manga.ratings.length > 0
      ? manga.ratings.reduce((a, b) => a + b.score, 0) / manga.ratings.length
      : 0;

  return NextResponse.json({
    ...manga,
    avgRating,
    genres: manga.genres.map((g) => g.genre),
  });
}
