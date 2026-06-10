import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#ff2d55,#ff6b2b)",
          color: "#fff",
          fontSize: 104,
          fontWeight: 900,
          letterSpacing: -4,
        }}
      >
        IV
      </div>
    ),
    { ...size }
  );
}
