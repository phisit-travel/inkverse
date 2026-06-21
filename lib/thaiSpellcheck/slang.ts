// ── Curated Thai slang / internet-word allow-list ────────────────────────────
// These are common informal/internet words that a future word-dictionary would
// flag as "unknown" but which are perfectly valid in casual Thai prose. They are
// suppressed from unknown-word flags (Layer 2). Keep additions conservative and
// genuinely common — this list only ever REDUCES noise, never adds flags.
//
// Lowercased & compared exactly against word tokens. Pure data, isomorphic.

export const THAI_SLANG: ReadonlySet<string> = new Set([
  // laughter / reactions
  "555", "5555", "55555", "5555+", "อิอิ", "อิ", "ฮือ", "ฮือๆ", "ว้าย", "ว้าววว",
  // internet shortenings / particles
  "มุง", "กรู", "ตู", "เมิง", "เทอ", "เธอว์",
  "จุงเบย", "เบย", "ป่ะ", "ปะ", "เปล่า", "ชิมิ", "ชิ", "อ่ะ", "อ้ะ", "อะ",
  "ดิ", "ดิๆ", "สิ", "นะ", "น้า", "น่ะ", "จ้า", "จ๊ะ", "จ้ะ", "เนอะ", "เนาะ",
  "ค่า", "คับ", "ครับผม", "งับ", "ฮะ", "ฮ้า",
  // intensifiers / reactions
  "ปั๊วะ", "ปุๆ", "อ่อ", "อ๋อ", "เอ๊ะ", "เห้อ", "เฮ้อ", "โว้ย", "เว้ย", "วะ", "ว่ะ",
  "งุงิ", "งง", "เมา", "ปวดตับ", "จกตา", "เทพ", "โกง", "เกรียน",
  // common net-speak nouns / actions
  "เซลฟี่", "ฟิน", "ฟินเวอร์", "อิน", "เมาท์", "มอย", "ดราม่า", "ติ่ง", "จิ้น",
  "ชิป", "ชิปปิ้ง", "ออเจ้า", "นางเอก", "พระเอก",
  "โอป้า", "ซือ", "ฮยอง", "นูน่า", "อันนยอง",
  // abbreviations frequently typed as-is
  "อ่านต่อ", "ตอนต่อไป", "จบบริบูรณ์", "ปะล่ะ", "ม่ะ", "บ่",
]);

// Normalize a token for slang comparison (trim only — Thai has no case).
export function isSlang(token: string): boolean {
  return THAI_SLANG.has(token.trim());
}
