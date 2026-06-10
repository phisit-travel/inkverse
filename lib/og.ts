// Loads a Thai-capable font for next/og ImageResponse so Thai text renders
// instead of tofu boxes. Cached per server instance. Returns null on failure
// (the OG route then falls back to the default font — never crashes).
let cached: ArrayBuffer | null = null;

export async function loadThaiFont(): Promise<ArrayBuffer | null> {
  if (cached) return cached;
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-thai@5/files/noto-sans-thai-thai-700-normal.woff",
      { cache: "force-cache" }
    );
    if (!res.ok) return null;
    cached = await res.arrayBuffer();
    return cached;
  } catch {
    return null;
  }
}
