import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const commentSchema = z.object({
  chapterId: z.string().min(1),
  content: z.string().min(1).max(2000),
  isSpoiler: z.boolean().optional().default(false),
  parentId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const chapterId = searchParams.get("chapterId");

  if (!chapterId) {
    return NextResponse.json({ error: "chapterId required" }, { status: 400 });
  }

  const comments = await prisma.comment.findMany({
    where: { chapterId, parentId: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { username: true, avatarUrl: true } },
      replies: {
        include: { user: { select: { username: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
        take: 20,
      },
    },
  });

  return NextResponse.json({ data: comments });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const rl = rateLimit(`comment:${userId}`, 10, 60_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "คอมเมนต์บ่อยเกินไป กรุณารอสักครู่" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );

  const body = await req.json().catch(() => null);
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { chapterId, content, isSpoiler, parentId } = parsed.data;

  const comment = await prisma.comment.create({
    data: { userId, chapterId, content, isSpoiler, parentId },
    include: { user: { select: { username: true, avatarUrl: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
