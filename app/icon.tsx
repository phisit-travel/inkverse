import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// INKVERSE "IV" monogram — monochrome brand mark (matches the app launcher icon).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          color: "#ffffff",
          fontSize: 300,
          fontWeight: 900,
          letterSpacing: 4,
        }}
      >
        IV
      </div>
    ),
    { ...size }
  );
}
