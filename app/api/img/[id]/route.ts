import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isChapterLocked } from "@/lib/chapters";
import { hasUnlockedChapter } from "@/lib/coins";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Authenticated image proxy. Manga page images are served through here instead of
// exposing the raw R2 URL, so a scraper can't bulk-grab predictable URLs: every
// request is access-checked (live + unlocked) and rate-limited. The reader loads
// these as blobs, so the real source never appears in the page.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Throttle bulk scraping — a human turns pages far slower than this.
  if (!rateLimit(`img:${clientIp(req)}`, 200, 60_000).ok) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  const { id } = await params;
  const page = await prisma.page.findUnique({
    where: { id },
    select: {
      imageUrl: true,
      chapter: {
        select: {
          id: true,
          isPremium: true,
          freeAt: true,
          status: true,
          publishAt: true,
          manga: { select: { translator: { select: { userId: true } } } },
        },
      },
    },
  });
  if (!page?.chapter) return new NextResponse("Not found", { status: 404 });
  const ch = page.chapter;

  const session = await auth();
  const userId = session?.user ? (session.user as { id?: string }).id : null;
  const role = session?.user ? (session.user as { role?: string }).role : null;
  const isOwner = !!userId && ch.manga?.translator?.userId === userId;
  const isAdmin = role === "ADMIN";

  if (!isOwner && !isAdmin) {
    // Draft / scheduled chapters are not public.
    const notLive = ch.status === "DRAFT" || (!!ch.publishAt && new Date(ch.publishAt).getTime() > Date.now());
    if (notLive) return new NextResponse("Not found", { status: 404 });
    // Premium / early-access lock.
    const unlocked = userId ? await hasUnlockedChapter(userId, ch.id) : false;
    if (isChapterLocked(ch, unlocked)) return new NextResponse("Locked", { status: 403 });
  }

  const upstream = await fetch(page.imageUrl);
  if (!upstream.ok || !upstream.body) return new NextResponse("Bad gateway", { status: 502 });

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
