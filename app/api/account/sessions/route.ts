import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";
import { listSessions, parseDevice } from "@/lib/deviceSessions";

const UNKNOWN_DEVICE = "อุปกรณ์ไม่ทราบชื่อ";

// Untamperable-first client IP (mirrors proxy.ts): prefer cf-connecting-ip /
// x-real-ip over the spoofable leftmost x-forwarded-for.
function clientIp(req: NextRequest): string | null {
  return (
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
    null
  );
}

// Self-heal the current session's device label from this live request. Login-time
// capture can come up empty depending on the auth path (notably the web-Google
// flow, where next/headers() isn't always populated when the row is created),
// leaving `device` as "อุปกรณ์ไม่ทราบชื่อ". The request that loads this page has a
// guaranteed-fresh User-Agent, so relabel from it. Only improves on an unknown
// label, only writes on a real change. Best-effort; never throws.
async function healCurrentDevice(sid: string, req: NextRequest): Promise<void> {
  const ua = req.headers.get("user-agent");
  if (!ua) return;
  const device = parseDevice(ua);
  if (device === UNKNOWN_DEVICE) return;
  try {
    const row = await prisma.userSession.findUnique({
      where: { id: sid },
      select: { device: true, userAgent: true, ip: true },
    });
    if (!row) return;
    const ip = clientIp(req);
    const data: { device?: string; userAgent?: string; ip?: string } = {};
    if (row.device !== device) data.device = device;
    if (!row.userAgent) data.userAgent = ua;
    if (ip && !row.ip) data.ip = ip;
    if (Object.keys(data).length === 0) return;
    await prisma.userSession.update({ where: { id: sid }, data });
  } catch {
    // session may have been revoked between checks — ignore.
  }
}

// List the signed-in user's active device sessions, flagging the current one.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return apiError("AUTH-007", 401);
  const userId = (session.user as { id: string }).id;

  // `sid` is populated once the Director wires it into the JWT/session; until
  // then it's undefined and nothing is flagged as current.
  const sid = (session.user as { sid?: string }).sid;

  if (sid) await healCurrentDevice(sid, req);

  const rows = await listSessions(userId);
  const sessions = rows.map((s) => ({ ...s, current: s.id === sid }));

  return NextResponse.json({ sessions });
}
