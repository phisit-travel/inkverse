import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decodeSlug } from "@/lib/slug";
import { apiError } from "@/lib/apiError";

/**
 * Resolve a manga by slug and verify the caller owns it (its translator) or is
 * an admin. Returns `{ err }` (a ready-to-return error response) or `{ manga }`.
 * Use `if ("err" in r) return r.err;` then read `r.manga`.
 */
export async function resolveOwnedManga(
  rawSlug: string
): Promise<{ err: NextResponse } | { manga: { id: string; translatorId: string | null } }> {
  const session = await auth();
  if (!session?.user) return { err: apiError("AUTH-007", 401) };
  const role = (session.user as { role?: string }).role;
  if (role !== "TRANSLATOR" && role !== "ADMIN") return { err: apiError("AUTH-008", 403) };

  const slug = decodeSlug(rawSlug);
  const manga = await prisma.manga.findUnique({
    where: { slug },
    select: { id: true, translatorId: true },
  });
  if (!manga) return { err: apiError("READ-004", 404) };

  if (role === "TRANSLATOR") {
    const userId = (session.user as { id: string }).id;
    const translator = await prisma.translator.findUnique({ where: { userId }, select: { id: true } });
    if (!translator || manga.translatorId !== translator.id) return { err: apiError("UP-004", 403) };
  }
  return { manga };
}

/** Same as resolveOwnedManga but keyed by chapter id (for chapter-scoped routes). */
export async function resolveOwnedChapter(
  chapterId: string
): Promise<{ err: NextResponse } | { chapter: { id: string; mangaId: string; mangaSlug: string } }> {
  const session = await auth();
  if (!session?.user) return { err: apiError("AUTH-007", 401) };
  const role = (session.user as { role?: string }).role;
  if (role !== "TRANSLATOR" && role !== "ADMIN") return { err: apiError("AUTH-008", 403) };

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, mangaId: true, manga: { select: { slug: true, translatorId: true } } },
  });
  if (!chapter) return { err: apiError("READ-004", 404) };

  if (role === "TRANSLATOR") {
    const userId = (session.user as { id: string }).id;
    const translator = await prisma.translator.findUnique({ where: { userId }, select: { id: true } });
    if (!translator || chapter.manga.translatorId !== translator.id) return { err: apiError("UP-004", 403) };
  }
  return { chapter: { id: chapter.id, mangaId: chapter.mangaId, mangaSlug: chapter.manga.slug } };
}
