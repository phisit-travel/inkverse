import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyImageToken } from "@/lib/imageToken";
import { getPresignedDownloadUrl } from "@/lib/r2";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { apiError } from "@/lib/apiError";

// Authenticated, signed image proxy. Manga page images are served through here
// instead of exposing the raw R2 URL. Each request must carry a valid, unexpired
// signature (?e&s) minted by the chapter reader after it passed access control,
// so URLs can't be forged or reused after the window — and a script can't bulk-
// grab predictable URLs. Rate-limited per IP. The reader loads these as blobs.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Throttle bulk scraping — a human turns pages far slower than this.
  if (!rateLimit(`img:${clientIp(req)}`, 200, 60_000).ok) {
    return apiError("IMG-003", 429);
  }

  const { id } = await params;
  const e = req.nextUrl.searchParams.get("e");
  const u = req.nextUrl.searchParams.get("u");
  const s = req.nextUrl.searchParams.get("s");

  // Signed + unexpired token is the access grant (minted post-authorization).
  if (!verifyImageToken(id, e, u, s)) {
    return apiError("IMG-001", 403);
  }

  // Behavioral throttle: the token binds the reader's id, so we can cap sustained
  // per-user volume. A human reading never pulls this many pages over 10 minutes;
  // a ripper grabbing whole series does. (Per-IP burst limit above still applies.)
  if (u && u !== "anon" && !rateLimit(`img:u:${u}`, 1200, 600_000).ok) {
    return apiError("IMG-003", 429);
  }

  const page = await prisma.page.findUnique({ where: { id }, select: { imageUrl: true } });
  if (!page) return apiError("IMG-002", 404);

  // Proxy the bytes through this function (same-origin response). We tried a 302
  // redirect to a presigned R2 URL for speed, but a cross-origin redirect that the
  // client then reads as a blob breaks on mobile: iOS Safari rejects the
  // CORS-after-redirect read, and inside the app the service worker can't return
  // the redirected response to a non-navigation fetch. Same-origin bytes "just
  // work" everywhere; the SW + browser still cache the result for fast re-reads.
  const isLegacyPublic = /^https?:\/\//i.test(page.imageUrl);
  const src = isLegacyPublic ? page.imageUrl : await getPresignedDownloadUrl(page.imageUrl);
  const upstream = await fetch(src);
  if (!upstream.ok || !upstream.body) return apiError("IMG-004", 502);

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "image/webp",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
