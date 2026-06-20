import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
import { decodeSlug } from "@/lib/slug";

// Covers are WebP, which Satori can't render — fetch + transcode to a PNG data URI.
async function coverPng(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const png = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(410, 630, { fit: "cover" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

// nodejs (NOT edge): Prisma uses the pg adapter which is not edge-compatible.
export const runtime = "nodejs";
export const revalidate = 86400;
export const alt = "INKVERSE";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fonts must come over https (file:// fetch isn't supported on the runtime).
// Thai + Latin so both Thai and English titles render. Cached per instance.
let fontsCache: { name: string; data: ArrayBuffer; weight: 700; style: "normal" }[] | null = null;
async function getFonts() {
  if (fontsCache) return fontsCache;
  async function fetchFont(url: string): Promise<ArrayBuffer | null> {
    try {
      const r = await fetch(url, { cache: "force-cache" });
      return r.ok ? await r.arrayBuffer() : null;
    } catch {
      return null;
    }
  }
  const [thai, latin] = await Promise.all([
    fetchFont("https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-thai@5/files/noto-sans-thai-thai-700-normal.woff"),
    fetchFont("https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5/files/noto-sans-latin-700-normal.woff"),
  ]);
  const fonts: { name: string; data: ArrayBuffer; weight: 700; style: "normal" }[] = [];
  if (latin) fonts.push({ name: "NotoLatin", data: latin, weight: 700, style: "normal" });
  if (thai) fonts.push({ name: "NotoThai", data: thai, weight: 700, style: "normal" });
  fontsCache = fonts;
  return fonts;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const [manga, fonts] = await Promise.all([
    prisma.manga.findUnique({ where: { slug }, select: { title: true, coverUrl: true, type: true } }),
    getFonts(),
  ]);

  const title = manga?.title || "INKVERSE";
  const type = manga?.type || "";
  const cover = await coverPng(manga?.coverUrl || null);
  const family = "NotoThai, NotoLatin, sans-serif";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0a0a0a", color: "#ffffff", fontFamily: family }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" width={410} height={630} style={{ width: 410, height: 630, objectFit: "cover" }} />
        ) : (
          <div style={{ width: 410, height: 630, background: "#161616" }} />
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 60, overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {type ? (
              <div style={{ alignSelf: "flex-start", background: "#ffffff", color: "#0a0a0a", fontSize: 22, fontWeight: 700, padding: "6px 18px", letterSpacing: 3, marginBottom: 30, display: "flex" }}>
                {type}
              </div>
            ) : null}
            <div style={{ fontSize: title.length > 38 ? 50 : 64, fontWeight: 700, lineHeight: 1.15, display: "flex" }}>
              {title.length > 72 ? title.slice(0, 72) + "…" : title}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, color: "#bdbdbd", marginBottom: 12, display: "flex" }}>อ่านมังงะ &amp; นิยายแปลไทย ฟรี</div>
            <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: 8, display: "flex" }}>INKVERSE</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
