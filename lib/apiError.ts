import { NextResponse } from "next/server";
import { ERROR_CODES, type ErrorCode } from "@/lib/errorCodes";

// Build a JSON error response carrying a code, e.g. apiError("AUTH-001", 400).
// The body is { error, code } so clients can show "[AUTH-001] <message>".
// Pass `message` to override the catalogue text; `extra` to add fields.
export function apiError(
  code: ErrorCode,
  status: number,
  opts?: { message?: string; extra?: Record<string, unknown>; headers?: HeadersInit }
) {
  return NextResponse.json(
    { error: opts?.message ?? ERROR_CODES[code], code, ...opts?.extra },
    { status, headers: opts?.headers }
  );
}
