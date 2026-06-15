import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError } from "@/lib/apiError";

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "ADMIN";
}

const patchSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  coins: z.number().int().min(0).optional(),
  price: z.number().min(0).optional(),
  bonus: z.number().int().min(0).optional(),
  vipDays: z.number().int().min(0).optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin()))
    return apiError("AUTH-008", 403);

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return apiError("VAL-001", 400, { message: "ข้อมูลแพ็กเกจไม่ถูกต้อง" });

  try {
    const pkg = await prisma.coinPackage.update({ where: { id }, data: parsed.data });
    return NextResponse.json(pkg);
  } catch {
    return apiError("VAL-002", 404, { message: "ไม่พบแพ็กเกจ" });
  }
}
