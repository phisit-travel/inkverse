import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const packages = await prisma.coinPackage.findMany({
    where: { isActive: true },
    orderBy: { coins: "asc" },
  });
  return NextResponse.json({ packages });
}
