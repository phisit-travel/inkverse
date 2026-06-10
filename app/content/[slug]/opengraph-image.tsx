import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { loadThaiFont } from "@/lib/og";

// nodejs (NOT edge): Prisma uses the pg adapter which is not edge-compatible.
export const runtime = "nodejs";
export const alt = "INKVERSE Manga Cover";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [manga, font] = await Promise.all([
    prisma.manga.findUnique({
      where: { slug },
      select: { title: true, description: true, coverUrl: true },
    }),
    loadThaiFont(),
  ]);

  const title = manga?.title || "INKVERSE";
  const description = manga?.description?.slice(0, 80) || "";

  return new ImageResponse(
    (
      <div
        style={{
          background: "#080a10",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "60px",
          gap: "48px",
          fontFamily: font ? "Noto Sans Thai" : "sans-serif",
        }}
      >
        {manga?.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={manga.coverUrl}
            width={240}
            height={320}
            alt=""
            style={{ borderRadius: 12, objectFit: "cover" }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              color: "#ff2d55",
              letterSpacing: 3,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            INKVERSE · อ่านมังงะออนไลน์
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.1,
              marginBottom: 16,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 22, color: "#9a9db0", lineHeight: 1.5 }}>
            {description}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "Noto Sans Thai", data: font, weight: 700 as const, style: "normal" as const }]
        : [],
    }
  );
}
