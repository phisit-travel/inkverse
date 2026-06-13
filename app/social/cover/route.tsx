import { ImageResponse } from "next/og";
import { loadThaiFont } from "@/lib/og";

// Brand cover/banner for social pages (Facebook 1640×624). Open /social/cover and save.
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
          justifyContent: "center",
          padding: "0 120px",
          position: "relative",
          fontFamily: font ? "Noto Sans Thai" : "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 44,
            right: 44,
            bottom: 44,
            border: "2px solid rgba(255,255,255,0.16)",
            display: "flex",
          }}
        />
        <div style={{ fontSize: 30, letterSpacing: "0.42em", color: "#8a8a8a", display: "flex" }}>
          READ · CREATE · EARN
        </div>
        <div style={{ fontSize: 172, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1, marginTop: 10, display: "flex" }}>
          INKVERSE
        </div>
        <div style={{ fontSize: 42, color: "#cccccc", marginTop: 30, display: "flex" }}>
          อ่านมังงะ · มังฮวา · นิยาย แปลไทย
        </div>
        <div style={{ fontSize: 30, color: "#9a9a9a", marginTop: 16, display: "flex" }}>
          สนับสนุนนักเขียน รับ 80% · inkverse.com
        </div>
      </div>
    ),
    {
      width: 1640,
      height: 624,
      fonts: font ? [{ name: "Noto Sans Thai", data: font, weight: 700 as const, style: "normal" as const }] : [],
    }
  );
}
