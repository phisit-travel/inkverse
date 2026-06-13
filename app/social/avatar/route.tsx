import { ImageResponse } from "next/og";
import { loadThaiFont } from "@/lib/og";

// Brand profile picture for social pages. Open /social/avatar and save the PNG.
export const runtime = "nodejs";

export async function GET() {
  const font = await loadThaiFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000000",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: font ? "Noto Sans Thai" : "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 70,
            left: 70,
            right: 70,
            bottom: 70,
            border: "3px solid rgba(255,255,255,0.18)",
            display: "flex",
          }}
        />
        <div style={{ fontSize: 360, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.03em", display: "flex" }}>
          IV
        </div>
        <div
          style={{
            fontSize: 86,
            fontWeight: 700,
            letterSpacing: "0.34em",
            marginTop: 24,
            paddingLeft: "0.34em",
            display: "flex",
          }}
        >
          INKVERSE
        </div>
      </div>
    ),
    {
      width: 1000,
      height: 1000,
      fonts: font ? [{ name: "Noto Sans Thai", data: font, weight: 700 as const, style: "normal" as const }] : [],
    }
  );
}
