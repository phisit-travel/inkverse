import { prisma } from "./prisma";

export async function getUserCoins(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coins: true },
  });
  return user?.coins ?? 0;
}

export async function hasUnlockedChapter(
  userId: string,
  chapterId: string
): Promise<boolean> {
  const unlock = await prisma.unlockedChapter.findUnique({
    where: { userId_chapterId: { userId, chapterId } },
  });
  return !!unlock;
}

export type UnlockResult =
  | { success: true; coinsLeft: number }
  | { success: false; error: "NOT_PREMIUM" | "ALREADY_UNLOCKED" | "INSUFFICIENT_COINS" | "NOT_FOUND" };

export async function unlockChapter(
  userId: string,
  chapterId: string
): Promise<UnlockResult> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { isPremium: true, coinCost: true, mangaId: true, chapterNum: true },
  });

  if (!chapter) return { success: false, error: "NOT_FOUND" };
  if (!chapter.isPremium) return { success: false, error: "NOT_PREMIUM" };

  const alreadyUnlocked = await hasUnlockedChapter(userId, chapterId);
  if (alreadyUnlocked) return { success: false, error: "ALREADY_UNLOCKED" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coins: true },
  });
  if (!user || user.coins < chapter.coinCost) {
    return { success: false, error: "INSUFFICIENT_COINS" };
  }

  // Atomic: deduct coins + create unlock + log transaction
  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { coins: { decrement: chapter.coinCost } },
    }),
    prisma.unlockedChapter.create({
      data: { userId, chapterId, coinSpent: chapter.coinCost },
    }),
    prisma.coinTransaction.create({
      data: {
        userId,
        amount: -chapter.coinCost,
        type: "SPEND",
        description: `ปลดล็อกตอนที่ ${chapter.chapterNum}`,
        refId: chapterId,
      },
    }),
  ]);

  return { success: true, coinsLeft: updatedUser.coins };
}

export async function topupCoins(
  userId: string,
  packageId: string
): Promise<{ success: true; coinsAdded: number; coinsTotal: number } | { success: false; error: string }> {
  const pkg = await prisma.coinPackage.findUnique({
    where: { id: packageId },
  });
  if (!pkg || !pkg.isActive) return { success: false, error: "PACKAGE_NOT_FOUND" };

  const total = pkg.coins + pkg.bonus;

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { coins: { increment: total } },
    }),
    prisma.coinTransaction.create({
      data: {
        userId,
        amount: total,
        type: "TOPUP",
        description: `ซื้อแพ็กเกจ ${pkg.name} (${pkg.coins}+${pkg.bonus} เหรียญ)`,
        refId: packageId,
      },
    }),
  ]);

  return { success: true, coinsAdded: total, coinsTotal: updatedUser.coins };
}
