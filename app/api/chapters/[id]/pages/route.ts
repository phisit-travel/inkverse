import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return apiError("AUTH-007", 401);

  const { id } = await params;
  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id: string }).id;

  const chapter = await prisma.chapter.findUnique({
    where: { id },
    include: {
      pages: { orderBy: { pageNum: "asc" } },
      manga: { select: { translatorId: true } },
    },
  });
  if (!chapter) return apiError("READ-001", 404);

  if (role !== "ADMIN") {
    const translator = await prisma.translator.findUnique({ where: { userId } });
    if (!translator || chapter.manga.translatorId !== translator.id) {
      return apiError("UP-004", 403);
    }
  }

  return NextResponse.json(chapter.pages);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return apiError("AUTH-007", 401);

  const { id } = await params;
  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id: string }).id;

  const chapter = await prisma.chapter.findUnique({
    where: { id },
    include: { manga: { select: { translatorId: true } } },
  });
  if (!chapter) return apiError("READ-001", 404);

  if (role !== "ADMIN") {
    const translator = await prisma.translator.findUnique({ where: { userId } });
    if (!translator || chapter.manga.translatorId !== translator.id) {
      return apiError("UP-004", 403);
    }
  }

  const body = await req.json().catch(() => ({})) as {
    pages: { id: string; pageNum: number }[];
  };

  if (!Array.isArray(body.pages) || body.pages.length === 0) {
    return apiError("VAL-001", 400, { message: "ต้องระบุรายการหน้า (pages)" });
  }

  // Validate all page IDs belong to this chapter
  const existingPages = await prisma.page.findMany({
    where: { chapterId: id },
    select: { id: true },
  });
  const validIds = new Set(existingPages.map((p) => p.id));
  for (const p of body.pages) {
    if (!validIds.has(p.id)) {
      return apiError("VAL-001", 400, { message: "มีหน้าที่ไม่ได้อยู่ในตอนนี้" });
    }
  }

  // Batch update
  await prisma.$transaction(
    body.pages.map((p) =>
      prisma.page.update({ where: { id: p.id }, data: { pageNum: p.pageNum } })
    )
  );

  return NextResponse.json({ ok: true, count: body.pages.length });
}
