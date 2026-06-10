import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "ADMIN";
}

export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const packages = await prisma.coinPackage.findMany({ orderBy: { price: "asc" } });
  return NextResponse.json({ packages });
}

const createSchema = z.object({
  id: z.string().min(1).max(40).regex(/^[a-z0-9_-]+$/, "id: a-z 0-9 _ - เท่านั้น"),
  name: z.string().min(1).max(40),
  coins: z.number().int().min(0),
  price: z.number().min(0),
  bonus: z.number().int().min(0).default(0),
  vipDays: z.number().int().min(0).default(0),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.coinPackage.findUnique({ where: { id: parsed.data.id } });
  if (existing)
    return NextResponse.json({ error: "มี id นี้อยู่แล้ว" }, { status: 409 });

  const pkg = await prisma.coinPackage.create({ data: parsed.data });
  return NextResponse.json(pkg, { status: 201 });
}
