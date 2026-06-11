import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

const APP_BONUS = 20;

// One-time coin bonus for installing + signing in on the Android app.
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  // Atomic: only the first request (where appBonusAt is still null) grants coins.
  const claimed = await prisma.user.updateMany({
    where: { id: userId, appBonusAt: null },
    data: { appBonusAt: new Date(), coins: { increment: APP_BONUS } },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ granted: 0, already: true });
  }

  await prisma.coinTransaction.create({
    data: { userId, amount: APP_BONUS, type: "BONUS", description: `โบนัสติดตั้งแอป Android +${APP_BONUS} เหรียญ` },
  });
  await createNotification({
    userId,
    type: "APP_BONUS",
    title: "ยินดีต้อนรับสู่แอป! 🎉",
    body: `รับ ${APP_BONUS} เหรียญฟรีจากการติดตั้งแอป Android เรียบร้อยแล้ว`,
    link: "/topup",
  });
  return NextResponse.json({ granted: APP_BONUS });
}
