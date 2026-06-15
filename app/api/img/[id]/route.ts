import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyImageToken } from "@/lib/imageToken";
import { getPresignedDownloadUrl } from "@/lib/r2";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Authenticated, signed image proxy. Manga page images are served through here
// instead of exposing the raw R2 URL. Each request must carry a valid, unexpired
// signature (?e&s) minted by the chapter reader after it passed access control,
// so URLs can't be forged or reused after the window — and a script can't bulk-
// grab predictable URLs. Rate-limited per IP. The reader loads these as blobs.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Throttle bulk scraping — a human turns pages far slower than this.
  if (!rateLimit(`img:${clientIp(req)}`, 200, 60_000).ok) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  const { id } = await params;
  const e = req.nextUrl.searchParams.get("e");
  const u = req.nextUrl.searchParams.get("u");
  const s = req.nextUrl.searchParams.get("s");

  // Signed + unexpired token is the access grant (minted post-authorization).
  if (!verifyImageToken(id, e, u, s)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Behavioral throttle: the token binds the reader's id, so we can cap sustained
  // per-user volume. A human reading never pulls this many pages over 10 minutes;
  // a ripper grabbing whole series does. (Per-IP burst limit above still applies.)
  if (u && u !== "anon" && !rateLimit(`img:u:${u}`, 1200, 600_000).ok) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  const page = await prisma.page.findUnique({ where: { id }, select: { imageUrl: true } });
  if (!page) return new NextResponse("Not found", { status: 404 });

  // Hand back a short-lived direct URL instead of proxying the bytes through this
  // function: R2 (behind Cloudflare) serves the image straight to the client, so
  // the serverless function is out of the heavy data path — the old proxy made
  // every page round-trip R2 → Vercel → client and skipped all CDN caching.
  // Access is already gated above by the signed token + per-IP/per-user limits;
  // the presigned URL expires in 15 min. Legacy public objects redirect as-is.
  // NOTE: the reader fetches this as a blob for the canvas, so the private bucket
  // must allow GET CORS from the site origin.
  const isLegacyPublic = /^https?:\/\//i.test(page.imageUrl);
  const src = isLegacyPublic ? page.imageUrl : await getPresignedDownloadUrl(page.imageUrl, 900);

  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: src,
      // Briefly cache the redirect in the browser so re-scrolling doesn't re-hit
      // the function — well under the presigned URL's 15-min lifetime.
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
