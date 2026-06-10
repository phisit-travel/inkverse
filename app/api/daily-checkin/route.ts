import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { claimDailyCheckIn, getCheckInStatus } from "@/lib/coins";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const status = await getCheckInStatus(userId);
  return NextResponse.json(status);
}

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  // Cheap guard against rapid double-submits; the DB unique constraint is the
  // real once-per-day enforcement.
  const rl = rateLimit(`checkin:${userId}`, 3, 60_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "ดำเนินการบ่อยเกินไป กรุณาลองใหม่" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );

  const result = await claimDailyCheckIn(userId);
  if (!result.success)
    return NextResponse.json(
      { error: "วันนี้เช็คอินไปแล้ว" },
      { status: 409 }
    );

  return NextResponse.json(result);
}
