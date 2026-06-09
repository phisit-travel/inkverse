import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const ratingSchema = z.object({
  mangaId: z.string().min(1),
  score: z.number().int().min(1).max(5),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const parsed = ratingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mangaId, score } = parsed.data;

  const rating = await prisma.rating.upsert({
    where: { userId_mangaId: { userId, mangaId } },
    create: { userId, mangaId, score },
    update: { score },
  });

  return NextResponse.json(rating);
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
