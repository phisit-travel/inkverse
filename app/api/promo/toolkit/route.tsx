import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

// Downloadable promo banner advertising the new WRITER pro-toolkit. Pure text/
// layout (no DB, no cover) so it renders fast and never depends on R2.
//   ?format=square (1080x1080, IG/FB feed) · story (1080x1920, IG/TikTok) ·
//   wide (1200x630, X/Facebook link card / OG)
export const runtime = "nodejs";

let fontsCache: { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[] | null = null;
async function getFonts() {
  if (fontsCache) return fontsCache;
  const f = async (u: string) => { try { const r = await fetch(u, { cache: "force-cache" }); return r.ok ? await r.arrayBuffer() : null; } catch { return null; } };
  const [thai7, latin7, thai4, latin4] = await Promise.all([
    f("https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-thai@5/files/noto-sans-thai-thai-700-normal.woff"),
    f("https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5/files/noto-sans-latin-700-normal.woff"),
    f("https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-thai@5/files/noto-sans-thai-thai-400-normal.woff"),
    f("https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5/files/noto-sans-latin-400-normal.woff"),
  ]);
  const fonts: { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[] = [];
  if (latin7) fonts.push({ name: "Noto", data: latin7, weight: 700, style: "normal" });
  if (thai7) fonts.push({ name: "Noto", data: thai7, weight: 700, style: "normal" });
  if (latin4) fonts.push({ name: "Noto", data: latin4, weight: 400, style: "normal" });
  if (thai4) fonts.push({ name: "Noto", data: thai4, weight: 400, style: "normal" });
  fontsCache = fonts;
  return fonts;
}

const COPY = {
  writer: {
    headline: "เครื่องมือนักเขียนระดับโปร",
    tagline: "เขียนลื่น · เก็บงานปลอดภัย · โตได้จริง",
    cta: "เริ่มเขียนฟรี — สมัครนักเขียนได้เลยที่",
    tools: [
      "เอดิเตอร์ WYSIWYG",
      "ประวัติเวอร์ชัน · กู้คืนได้",
      "Story Bible คลังข้อมูลเรื่อง",
      "สถิติรายเรื่อง (Analytics)",
      "ส่งออก .txt / .epub",
      "โหมดโฟกัส + บันทึกอัตโนมัติ",
    ],
  },
  tl: {
    headline: "เครื่องมือนักแปลระดับโปร",
    tagline: "อัปไว · แปลเนียน · คุมงานเป็นระบบ",
    cta: "เริ่มแปลฟรี — สมัครนักแปลได้เลยที่",
    tools: [
      "ตัดภาพยาว manhwa อัตโนมัติ",
      "คลังคำแปล/ชื่อ (Glossary)",
      "พรีวิวก่อนเผยแพร่",
      "อัปหลายตอนรวดเดียว",
      "สถิติรายเรื่อง (Analytics)",
      "อ่านล่วงหน้า / พรีเมียม",
    ],
  },
} as const;

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const fmt = sp.get("format") || "square";
  const role = sp.get("role") === "tl" ? "tl" : "writer";
  const copy = COPY[role];
  const TOOLS = copy.tools;
  const story = fmt === "story";
  const wide = fmt === "wide";
  const W = wide ? 1200 : 1080;
  const H = wide ? 630 : story ? 1920 : 1080;
  const pad = wide ? 56 : story ? 96 : 80;
  const head = wide ? 60 : story ? 104 : 86;
  const brand = wide ? 26 : story ? 40 : 34;
  const chipFont = wide ? 22 : story ? 34 : 28;
  const subFont = wide ? 24 : story ? 38 : 30;
  const fonts = await getFonts();

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0a0a", color: "#fff", fontFamily: "Noto, sans-serif", padding: pad }}>
        {/* top: brand + eyebrow */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: brand, fontWeight: 700, letterSpacing: 10 }}>INKVERSE</div>
          <div style={{ display: "flex", marginTop: wide ? 14 : 26, alignItems: "center" }}>
            <div style={{ display: "flex", background: "#fff", color: "#0a0a0a", fontSize: wide ? 20 : 26, fontWeight: 700, padding: "6px 18px", letterSpacing: 4 }}>ใหม่ · NEW</div>
          </div>
          <div style={{ display: "flex", fontSize: head, fontWeight: 700, lineHeight: 1.08, marginTop: wide ? 16 : 28, maxWidth: W - pad * 2 }}>
            {copy.headline}
          </div>
          <div style={{ display: "flex", fontSize: subFont, fontWeight: 400, color: "#cfcfcf", marginTop: wide ? 10 : 20 }}>
            {copy.tagline}
          </div>
        </div>

        {/* middle: tool chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: wide ? 10 : 16, marginTop: wide ? 14 : 0 }}>
          {TOOLS.map((t) => (
            <div key={t} style={{ display: "flex", alignItems: "center", border: "2px solid #2a2a2a", background: "#141414", padding: wide ? "10px 16px" : "16px 22px", width: wide ? (W - pad * 2 - 20) / 3 : (W - pad * 2 - 16) / 2, boxSizing: "border-box" }}>
              <div style={{ display: "flex", width: 12, height: 12, background: "#fff", marginRight: 14 }} />
              <div style={{ display: "flex", fontSize: chipFont, fontWeight: 700 }}>{t}</div>
            </div>
          ))}
        </div>

        {/* bottom: CTA */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: wide ? 22 : story ? 36 : 30, fontWeight: 400, color: "#cfcfcf" }}>{copy.cta}</div>
          <div style={{ display: "flex", fontSize: wide ? 38 : story ? 60 : 50, fontWeight: 700, letterSpacing: 3, marginTop: 8 }}>inksverse.com</div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts }
  );
}
