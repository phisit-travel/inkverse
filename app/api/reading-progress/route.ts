import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { apiError } from "@/lib/apiError";

// Persist the reader's current page so they resume where they stopped.
// Money-irrelevant: no coins touched, just an upsert of readHistory.lastPage.
const progressSchema = z.object({
  chapterId: z.string().min(1),
  page: z.number().int().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return apiError("AUTH-007", 401);
  }
  const userId = (session.user as { id: string }).id;

  // Generous limit — this fires on scroll, so 60/60s per user is plenty.
  const rl = rateLimit(`read-progress:${userId}`, 60, 60_000);
  if (!rl.ok)
    return apiError("RATE-001", 429, {
      headers: { "Retry-After": String(rl.retryAfter) },
    });

  const body = await req.json().catch(() => null);
  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VAL-001", 400, { message: "ข้อมูลความคืบหน้าไม่ถูกต้อง" });
  }

  const { chapterId, page } = parsed.data;

  await prisma.readHistory.upsert({
    where: { userId_chapterId: { userId, chapterId } },
    update: { lastPage: page, readAt: new Date() },
    create: { userId, chapterId, lastPage: page },
  });

  return NextResponse.json({ ok: true });
}
