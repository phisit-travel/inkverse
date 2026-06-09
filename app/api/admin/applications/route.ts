import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status") || "PENDING";

  const applications = await prisma.translatorApplication.findMany({
    where: { status },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, username: true, email: true, avatarUrl: true, createdAt: true } },
    },
  });

  return NextResponse.json({ applications });
}
