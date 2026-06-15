import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return apiError("AUTH-007", 401);

  const body = await req.json().catch(() => null);
  const packageId = body?.packageId as string | undefined;
  if (!packageId)
    return apiError("VAL-001", 400, { message: "ต้องระบุแพ็กเกจ" });

  const pkg = await prisma.coinPackage.findUnique({ where: { id: packageId } });
  if (!pkg || !pkg.isActive)
    return apiError("VAL-002", 404, { message: "ไม่พบแพ็กเกจนี้ หรือปิดใช้งานแล้ว" });

  const userId = (session.user as { id: string }).id;

  // Cancel any stale PENDING orders for this user + package
  await prisma.coinOrder.updateMany({
    where: { userId, packageId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  const order = await prisma.coinOrder.create({
    data: {
      userId,
      packageId,
      coins: pkg.coins,
      bonus: pkg.bonus,
      vipDays: pkg.vipDays,
      price: pkg.price,
      status: "PENDING",
    },
  });

  return NextResponse.json({ orderId: order.id });
}
