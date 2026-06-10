import { ImageResponse } from "next/og";
import { loadThaiFont } from "@/lib/og";

// Prisma (pg adapter) isn't edge-safe; this one needs no DB but we keep nodejs
// for consistency with the per-manga image.
export const runtime = "nodejs";
export const alt = "INKVERSE — อ่านมังงะออนไลน์ฟรี";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const font = await loadThaiFont();

  return new ImageResponse(
    (
      <div
        style={{
          background: "#080a10",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: font ? "Noto Sans Thai" : "sans-serif",
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 900, color: "#ff2d55", letterSpacing: 8 }}>
          INKVERSE
        </div>
        <div style={{ fontSize: 28, color: "#9a9db0", marginTop: 20 }}>
          อ่านมังงะออนไลน์ฟรี · มังฮวา · แปลไทย
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
