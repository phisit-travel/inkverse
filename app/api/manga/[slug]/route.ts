import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { liveChapterWhere } from "@/lib/chapters";
import { cleanTags } from "@/lib/tags";
import { apiError } from "@/lib/apiError";
import { decodeSlug } from "@/lib/slug";
import { revalidateMangaCache } from "@/lib/revalidate";

// Returns the manga only if the signed-in user owns it (translator) or is admin.
async function getMangaOwnership(slug: string) {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id: string }).id;

  const manga = await prisma.manga.findUnique({ where: { slug } });
  if (!manga) return null;
  if (role === "ADMIN") return manga;
  if (role !== "TRANSLATOR") return null;

  const translator = await prisma.translator.findUnique({ where: { userId } });
  if (!translator || manga.translatorId !== translator.id) return null;
  return manga;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);

  const manga = await prisma.manga.findUnique({
    where: { slug },
    include: {
      genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
      chapters: { where: liveChapterWhere(), orderBy: { chapterNum: "asc" } },
      translator: {
        select: { penName: true, bio: true },
      },
    },
  });

  if (!manga) {
    return apiError("READ-004", 404);
  }

  // avgRating is already a denormalized column on Manga (lib/mangaStats) —
  // include it explicitly so the response shape is unchanged.
  return NextResponse.json({
    ...manga,
    avgRating: manga.avgRating,
    genres: manga.genres.map((g) => g.genre),
  });
}

const STATUSES = ["ONGOING", "COMPLETED", "HIATUS"];
const TYPES = ["MANGA", "MANHWA", "MANHUA", "NOVEL"];
const RATINGS = ["EVERYONE", "TEEN", "ADULT"];

// Edit a manga the user owns (translator) or any (admin).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const manga = await getMangaOwnership(slug);
  if (!manga) return apiError("CREATE-003", 404);

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body.description === "string" && body.description.trim().length >= 10) data.description = body.description.trim();
  if (typeof body.coverUrl === "string" && body.coverUrl) data.coverUrl = body.coverUrl;
  if (STATUSES.includes(body.status)) data.status = body.status;
  if (TYPES.includes(body.type)) data.type = body.type;
  if (RATINGS.includes(body.contentRating)) data.contentRating = body.contentRating;
  if (["JP", "KR", "CN", "TH", "FR"].includes(body.originCountry)) data.originCountry = body.originCountry;
  if (Array.isArray(body.tags)) data.tags = cleanTags(body.tags);
  // Story-level publish/unpublish. true = visible to readers; false = the whole
  // เรื่อง is hidden everywhere public (owner/admin still manage + preview it).
  if (typeof body.published === "boolean") data.published = body.published;

  // Optional: replace the genre set
  if (Array.isArray(body.genreIds)) {
    const ids: string[] = (body.genreIds as unknown[]).filter((x): x is string => typeof x === "string");
    await prisma.$transaction([
      prisma.mangaGenre.deleteMany({ where: { mangaId: manga.id } }),
      prisma.mangaGenre.createMany({
        data: ids.map((genreId) => ({ mangaId: manga.id, genreId })),
        skipDuplicates: true,
      }),
    ]);
  }

  const updated = await prisma.manga.update({ where: { id: manga.id }, data });

  // Bust the cached story page + home feed so a publish/unpublish (and any other
  // edit here) appears/disappears for readers immediately instead of waiting out
  // the cache TTL.
  revalidateMangaCache(manga.slug);

  return NextResponse.json(updated);
}

// Delete a manga (and all its content) the user owns, or any (admin).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const manga = await getMangaOwnership(slug);
  if (!manga) return apiError("CREATE-003", 404);

  await prisma.$transaction([
    // TranslatorEarning has no FK to manga (scalar mangaId) — clean it manually.
    prisma.translatorEarning.deleteMany({ where: { mangaId: manga.id } }),
    // The rest (chapters→pages/unlocks/history/comments, genres, bookmarks,
    // ratings, weeklyStats) cascade on the manga delete.
    prisma.manga.delete({ where: { id: manga.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
