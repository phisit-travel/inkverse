// Anti-impersonation: display names / usernames / pen names that imply an
// official INKVERSE identity are reserved for identity-verified accounts only
// (User.verifiedAt != null).
//
// English terms are matched at a "token boundary" (start/end of string, or next
// to a non-letter like _ or a digit) so we catch "officialteam",
// "inkverse_official", "x_admin" — WITHOUT false-positiving words that merely
// contain the term mid-word (e.g. "badminton" → not blocked). Add terms below.
const EN_TERMS = ["official", "admin", "staff", "inkverse"];
const EN_RE = EN_TERMS.map(
  (t) => new RegExp(`(?:^|[^a-zA-Z])${t}|${t}(?:[^a-zA-Z]|$)`, "i")
);

// Thai terms (pen names can be Thai; usernames are latin-only). Plain substring
// — Thai has no spaces so boundary logic doesn't apply. NOTE: "ทีม/team" is
// intentionally allowed.
const TH_TERMS = [/ออฟฟิเชียล/, /แอดมิน/];

/** True if the name contains a reserved (official/staff-implying) term. */
export function nameRequiresVerification(name: string | null | undefined): boolean {
  if (!name) return false;
  return EN_RE.some((re) => re.test(name)) || TH_TERMS.some((re) => re.test(name));
}

/** Reserved-name check honouring the caller's verified status. */
export function isNameAllowed(name: string | null | undefined, isVerified: boolean): boolean {
  return isVerified || !nameRequiresVerification(name);
}

export const RESERVED_NAME_MESSAGE =
  "ชื่อนี้มีคำที่สงวนไว้ (เช่น official, admin, staff, inkverse) — ใช้ได้เฉพาะบัญชีที่ยืนยันตัวตนกับ INKVERSE แล้วเท่านั้น";
