import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError } from "@/lib/apiError";

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "ADMIN";
}

export async function GET() {
  if (!(await requireAdmin()))
    return apiError("AUTH-008", 403);

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
    return apiError("AUTH-008", 403);

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return apiError("VAL-001", 400, { message: "ข้อมูลแพ็กเกจไม่ถูกต้อง" });

  const existing = await prisma.coinPackage.findUnique({ where: { id: parsed.data.id } });
  if (existing)
    return apiError("VAL-003", 409, { message: "มี id นี้อยู่แล้ว" });

  const pkg = await prisma.coinPackage.create({ data: parsed.data });
  return NextResponse.json(pkg, { status: 201 });
}
