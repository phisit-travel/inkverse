import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const packageId = body?.packageId as string | undefined;
  if (!packageId)
    return NextResponse.json({ error: "packageId required" }, { status: 400 });

  const pkg = await prisma.coinPackage.findUnique({ where: { id: packageId } });
  if (!pkg || !pkg.isActive)
    return NextResponse.json({ error: "Package not found" }, { status: 404 });

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
      price: pkg.price,
      status: "PENDING",
    },
  });

  return NextResponse.json({ orderId: order.id });
}
