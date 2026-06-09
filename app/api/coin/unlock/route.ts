import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unlockChapter } from "@/lib/coins";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const chapterId = body?.chapterId as string | undefined;
  if (!chapterId) {
    return NextResponse.json({ error: "chapterId required" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;
  const result = await unlockChapter(userId, chapterId);

  if (!result.success) {
    const status =
      result.error === "INSUFFICIENT_COINS"
        ? 402
        : result.error === "NOT_FOUND"
        ? 404
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result);
}
