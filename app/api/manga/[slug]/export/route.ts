import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";
import { resolveOwnedManga } from "@/lib/mangaOwner";
import { rateLimit } from "@/lib/rate-limit";
import { buildTxt, buildEpub } from "@/lib/export";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await resolveOwnedManga(slug);
  if ("err" in r) return r.err;
  // Building a whole-novel epub is CPU work — cap per owner.
  if (!rateLimit(`export:${r.userId}`, 20, 60_000).ok) return apiError("RATE-001", 429);

  const format = new URL(req.url).searchParams.get("format") === "epub" ? "epub" : "txt";

  const manga = await prisma.manga.findUnique({
    where: { id: r.manga.id },
    select: {
      title: true,
      author: true,
      chapters: {
        orderBy: { chapterNum: "asc" },
        select: { chapterNum: true, title: true, content: true },
      },
    },
  });
  if (!manga) return apiError("READ-004", 404);

  const author = manga.author || "";
  const safe = (manga.title || "export").replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 60) || "export";
  const ascii = safe.replace(/[^\x20-\x7E]/g, "").trim() || "inkverse-export";
  const disp = (ext: string) =>
    `attachment; filename="${ascii}.${ext}"; filename*=UTF-8''${encodeURIComponent(safe)}.${ext}`;

  if (format === "epub") {
    const buf = buildEpub(manga.title, author, manga.chapters);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Disposition": disp("epub"),
        "Cache-Control": "no-store",
      },
    });
  }

  const txt = buildTxt(manga.title, author, manga.chapters);
  return new NextResponse(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": disp("txt"),
      "Cache-Control": "no-store",
    },
  });
}
