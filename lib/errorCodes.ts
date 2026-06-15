// ── INKVERSE error-code catalogue ───────────────────────────────────────────
// Every user-facing failure carries a short code (AREA-NNN) shown on screen, so
// the owner can report it and we can pinpoint the cause instantly. Client-safe
// (no server imports) — used both to build API errors and to render them.
//
// Areas:
//   AUTH   login / signup / session / bot-check / OAuth
//   COIN   coins / topup / payment / slip / withdraw
//   IMG    manga page image serving (/api/img)
//   UP     uploads (pages, covers, R2)
//   READ   reading / chapters / premium unlock
//   CREATE creator apply / manage
//   RATE   rate limiting / flood guard
//   NET    network / server / database / generic
//   OFF    offline / service worker / PWA
//   VAL    input validation

export const ERROR_CODES = {
  // ── Auth ──────────────────────────────────────────────
  "AUTH-001": "ยืนยันว่าไม่ใช่บอทไม่ผ่าน (Turnstile)",
  "AUTH-002": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  "AUTH-003": "อีเมลนี้ถูกใช้แล้ว",
  "AUTH-004": "ชื่อผู้ใช้ไม่ถูกต้องหรือถูกใช้แล้ว",
  "AUTH-005": "ส่งอีเมลยืนยันไม่สำเร็จ",
  "AUTH-006": "ตั้งค่าการเข้าสู่ระบบผิดพลาด (OAuth/cookie)",
  "AUTH-007": "กรุณาเข้าสู่ระบบก่อน",
  "AUTH-008": "ไม่มีสิทธิ์เข้าถึงส่วนนี้",

  // ── Coin / Payment ────────────────────────────────────
  "COIN-001": "เหรียญไม่พอ",
  "COIN-002": "ตรวจสอบสลิปไม่ผ่าน",
  "COIN-003": "สลิปนี้ถูกใช้ไปแล้ว",
  "COIN-004": "ยอดเงินในสลิปไม่ตรงกับแพ็กเกจ",
  "COIN-005": "ไม่พบคำสั่งซื้อ หรือหมดอายุแล้ว",
  "COIN-006": "จำนวนเงินที่ขอถอนไม่ถูกต้อง/ต่ำกว่าขั้นต่ำ",
  "COIN-007": "ระบบชำระเงินขัดข้อง (ผู้ให้บริการ)",

  // ── Image serving ─────────────────────────────────────
  "IMG-001": "ลิงก์รูปหมดอายุหรือไม่ถูกต้อง (token)",
  "IMG-002": "ไม่พบรูปหน้านี้",
  "IMG-003": "เปิดรูปถี่เกินไป (ถูกจำกัดชั่วคราว)",
  "IMG-004": "โหลดรูปจากที่จัดเก็บ (R2) ไม่สำเร็จ",

  // ── Upload ────────────────────────────────────────────
  "UP-001": "ระบบจัดเก็บไฟล์ (R2) ยังไม่พร้อม",
  "UP-002": "ขอสิทธิ์อัปโหลดไม่สำเร็จ",
  "UP-003": "ไฟล์ใหญ่เกินกำหนด",
  "UP-004": "ไม่ใช่เจ้าของผลงานนี้",
  "UP-005": "ชนิดไฟล์ไม่รองรับ",

  // ── Reading / Chapter ─────────────────────────────────
  "READ-001": "ไม่พบตอนนี้",
  "READ-002": "ตอนนี้ยังล็อก ต้องปลดล็อกด้วยเหรียญก่อน",
  "READ-003": "ตอนนี้ยังไม่เผยแพร่",
  "READ-004": "ไม่พบผลงานนี้",

  // ── Creator ───────────────────────────────────────────
  "CREATE-001": "ส่งใบสมัคร/บันทึกผลงานไม่สำเร็จ",
  "CREATE-002": "เลขตอนนี้มีอยู่แล้ว",
  "CREATE-003": "ไม่พบผลงาน หรือไม่มีสิทธิ์แก้ไข",

  // ── Rate limit ────────────────────────────────────────
  "RATE-001": "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่",

  // ── Network / Server ──────────────────────────────────
  "NET-001": "ระบบขัดข้องชั่วคราว",
  "NET-002": "ฐานข้อมูลขัดข้อง",
  "NET-003": "ออฟไลน์ / ไม่มีการเชื่อมต่ออินเทอร์เน็ต",

  // ── Offline / PWA ─────────────────────────────────────
  "OFF-001": "ระบบอ่านออฟไลน์ขัดข้อง",

  // ── Validation ────────────────────────────────────────
  "VAL-001": "ข้อมูลที่กรอกไม่ถูกต้อง",
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export function codeMessage(code: string): string {
  return (ERROR_CODES as Record<string, string>)[code] ?? "เกิดข้อผิดพลาด";
}
