import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { topupCoins } from "@/lib/coins";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const packageId = body?.packageId as string | undefined;
  if (!packageId) {
    return NextResponse.json({ error: "packageId required" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;
  const result = await topupCoins(userId, packageId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result);
}
