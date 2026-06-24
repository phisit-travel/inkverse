import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listedMangaWhere } from "@/lib/chapters";
import { isAppRequest, hideAdultWhen } from "@/lib/appContext";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);

  if (!q || q.length < 1) {
    return NextResponse.json({ data: [] });
  }

  // Web search returns 18+ (badge shown); the app hides it (Play Store).
  const mangas = await prisma.manga.findMany({
    where: {
      ...listedMangaWhere(),
      ...hideAdultWhen(await isAppRequest()),
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
      ],
    },
    take: limit,
    orderBy: { totalViews: "desc" },
    // Only the card fields — no full `description`, and use the denormalized
    // latestChapterNum instead of a per-row chapters subquery.
    select: {
      id: true,
      title: true,
      slug: true,
      coverUrl: true,
      type: true,
      status: true,
      totalViews: true,
      latestChapterNum: true,
      genres: { include: { genre: { select: { name: true } } } },
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
      latestChapter: m.latestChapterNum ?? null,
      genres: m.genres.map((g) => g.genre.name),
    })),
  });
}
