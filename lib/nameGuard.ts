// Anti-impersonation: display names / usernames / pen names that imply an
// official INKVERSE identity are reserved for identity-verified accounts only
// (User.verifiedAt != null). Add terms here to extend the protection.
const RESERVED = [/official/i, /ออฟฟิเชียล/, /ออฟฟิศเชียล/];

/** True if the name contains a reserved (official-implying) term. */
export function nameRequiresVerification(name: string | null | undefined): boolean {
  if (!name) return false;
  return RESERVED.some((re) => re.test(name));
}

/** Reserved-name check honouring the caller's verified status. */
export function isNameAllowed(name: string | null | undefined, isVerified: boolean): boolean {
  return isVerified || !nameRequiresVerification(name);
}

export const RESERVED_NAME_MESSAGE =
  'ชื่อที่มีคำว่า "official" สงวนไว้สำหรับบัญชีที่ยืนยันตัวตนกับ INKVERSE แล้วเท่านั้น';
