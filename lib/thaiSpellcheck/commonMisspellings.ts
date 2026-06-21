// ── Thai common-misspellings dictionary (LAYER 2, curated) ───────────────────
// The 0-baht / 0-license answer to word-level spelling: instead of bundling a
// 62k-word general dictionary (license-encumbered for commercial use, and
// false-positive-prone on names/slang), we ship a CURATED map of words Thai
// writers genuinely misspell often → the Royal-Institute-correct form.
//
// Why it works: each LEFT side is an UNAMBIGUOUSLY wrong spelling, so flagging it
// is near-zero false-positive, and it catches the "valid characters but wrong
// word" typos the mechanical rules (Layer 1) can't. Hand-authored → no
// third-party data, no licensing risk, free to give writers.
//
// Scope: native Thai words with ONE clearly-correct form. We avoid loanword
// transliterations with multiple accepted spellings. Severity is "warn" (a
// suggestion) so intentional/dialogue misspellings aren't punished. Grow over
// time — keep every entry unambiguous.

import type { Issue } from "./rules";

// wrong → correct (Royal Institute Dictionary form)
export const COMMON_MISSPELLINGS: Record<string, string> = {
  สังเกตุ: "สังเกต",
  อนุญาติ: "อนุญาต",
  ปรากฎ: "ปรากฏ",
  กฏหมาย: "กฎหมาย",
  ผลลัพท์: "ผลลัพธ์",
  คำนวน: "คำนวณ",
  โอกาศ: "โอกาส",
  ภาพยนต์: "ภาพยนตร์",
  ทะเลสาป: "ทะเลสาบ",
  ศรีษะ: "ศีรษะ",
  ปฏิกริยา: "ปฏิกิริยา",
  มาตราฐาน: "มาตรฐาน",
  บรรยากาส: "บรรยากาศ",
  นานับประการ: "นานัปการ",
  ไอศครีม: "ไอศกรีม",
  เท่ห์: "เท่",
  อุปสรรค์: "อุปสรรค",
  กระทันหัน: "กะทันหัน",
  จักรพรรดิ์: "จักรพรรดิ",
  โน๊ต: "โน้ต",
  กังวาล: "กังวล",
  เลือกสรรค์: "เลือกสรร",
  บรรดาล: "บันดาล",
  บรรได: "บันได",
  ผูกพันธ์: "ผูกพัน",
  เอนกประสงค์: "อเนกประสงค์",
  กงศุล: "กงสุล",
  คริสมาส: "คริสต์มาส",
  เปอร์เซนต์: "เปอร์เซ็นต์",
  อัพเดท: "อัปเดต",
  เว็ปไซต์: "เว็บไซต์",
  ประสิทธิ์ภาพ: "ประสิทธิภาพ",
  ฟิสิคส์: "ฟิสิกส์",
  คฑา: "คทา",
  กระเพรา: "กะเพรา",
  ลายเซ็นต์: "ลายเซ็น",
  เบรค: "เบรก",
  รสชาด: "รสชาติ",
  สอาด: "สะอาด",
  สดวก: "สะดวก",
  กระหล่ำ: "กะหล่ำ",
  กระเทย: "กะเทย",
  ผัดกระเพา: "ผัดกะเพรา",
  อิเลคทรอนิค: "อิเล็กทรอนิกส์",
};

// Active list: drop any accidental wrong===correct or non-Thai entries (defensive),
// longest-first so a longer wrong form wins over a shorter contained one.
const ENTRIES: [string, string][] = Object.entries(COMMON_MISSPELLINGS)
  .filter(([wrong, right]) => wrong !== right && /^[฀-๿]+$/.test(wrong))
  .sort((a, b) => b[0].length - a[0].length);

export function checkCommonMisspellings(text: string): Issue[] {
  if (!text) return [];
  const out: Issue[] = [];
  const taken: boolean[] = new Array(text.length).fill(false);
  for (const [wrong, right] of ENTRIES) {
    let from = 0;
    for (;;) {
      const idx = text.indexOf(wrong, from);
      if (idx === -1) break;
      const end = idx + wrong.length;
      let overlap = false;
      for (let k = idx; k < end; k++) if (taken[k]) { overlap = true; break; }
      if (!overlap) {
        for (let k = idx; k < end; k++) taken[k] = true;
        out.push({
          start: idx,
          end,
          type: "common-misspelling",
          message: `น่าจะสะกดผิด — "${right}"`,
          suggestion: right,
          severity: "warn",
        });
      }
      from = idx + 1;
    }
  }
  return out;
}
