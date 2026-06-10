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

const TRANSLATOR_SHARE = 0.70; // 70% to translator, 30% platform fee

export async function unlockChapter(
  userId: string,
  chapterId: string
): Promise<UnlockResult> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      isPremium: true, coinCost: true, mangaId: true, chapterNum: true,
      manga: { select: { translatorId: true } },
    },
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

  const translatorId = chapter.manga?.translatorId ?? null;
  const earningAmount = parseFloat((chapter.coinCost * TRANSLATOR_SHARE).toFixed(2));

  const updatedUser = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data: { coins: { decrement: chapter.coinCost } },
    });
    await tx.unlockedChapter.create({
      data: { userId, chapterId, coinSpent: chapter.coinCost },
    });
    await tx.coinTransaction.create({
      data: {
        userId,
        amount: -chapter.coinCost,
        type: "SPEND",
        description: `ปลดล็อกตอนที่ ${chapter.chapterNum}`,
        refId: chapterId,
      },
    });
    if (translatorId) {
      await tx.translatorEarning.create({
        data: {
          translatorId,
          chapterId,
          mangaId: chapter.mangaId,
          userId,
          coinsSpent: chapter.coinCost,
          amount: earningAmount,
        },
      });
    }
    return u;
  });

  return { success: true, coinsLeft: updatedUser.coins };
}

export type BulkUnlockResult =
  | { success: true; unlockedCount: number; coinsSpent: number; coinsLeft: number }
  | { success: false; error: "NOTHING_TO_UNLOCK" | "INSUFFICIENT_COINS" };

/**
 * Unlock several premium chapters at once. Skips chapters that aren't premium
 * or are already unlocked, charges the combined cost atomically, and credits
 * each chapter's translator their share.
 */
export async function unlockChaptersBulk(
  userId: string,
  chapterIds: string[]
): Promise<BulkUnlockResult> {
  const ids = [...new Set(chapterIds)].slice(0, 500);
  if (ids.length === 0) return { success: false, error: "NOTHING_TO_UNLOCK" };

  const chapters = await prisma.chapter.findMany({
    where: { id: { in: ids }, isPremium: true },
    select: {
      id: true, coinCost: true, mangaId: true,
      manga: { select: { translatorId: true } },
    },
  });
  if (chapters.length === 0) return { success: false, error: "NOTHING_TO_UNLOCK" };

  // Drop ones the user already owns.
  const owned = await prisma.unlockedChapter.findMany({
    where: { userId, chapterId: { in: chapters.map((c) => c.id) } },
    select: { chapterId: true },
  });
  const ownedSet = new Set(owned.map((o) => o.chapterId));
  const toUnlock = chapters.filter((c) => !ownedSet.has(c.id));
  if (toUnlock.length === 0) return { success: false, error: "NOTHING_TO_UNLOCK" };

  const totalCost = toUnlock.reduce((sum, c) => sum + c.coinCost, 0);

  const result = await prisma.$transaction(async (tx) => {
    // Conditional decrement guards against double-spend / negative balance.
    const dec = await tx.user.updateMany({
      where: { id: userId, coins: { gte: totalCost } },
      data: { coins: { decrement: totalCost } },
    });
    if (dec.count === 0) return null;

    await tx.unlockedChapter.createMany({
      data: toUnlock.map((c) => ({ userId, chapterId: c.id, coinSpent: c.coinCost })),
      skipDuplicates: true,
    });
    await tx.coinTransaction.create({
      data: {
        userId,
        amount: -totalCost,
        type: "SPEND",
        description: `ปลดล็อก ${toUnlock.length} ตอน`,
        refId: toUnlock[0].mangaId,
      },
    });
    const earnings = toUnlock
      .filter((c) => c.manga?.translatorId)
      .map((c) => ({
        translatorId: c.manga!.translatorId!,
        chapterId: c.id,
        mangaId: c.mangaId,
        userId,
        coinsSpent: c.coinCost,
        amount: parseFloat((c.coinCost * TRANSLATOR_SHARE).toFixed(2)),
      }));
    if (earnings.length) await tx.translatorEarning.createMany({ data: earnings });

    const u = await tx.user.findUnique({ where: { id: userId }, select: { coins: true } });
    return u;
  });

  if (!result) return { success: false, error: "INSUFFICIENT_COINS" };
  return {
    success: true,
    unlockedCount: toUnlock.length,
    coinsSpent: totalCost,
    coinsLeft: result.coins,
  };
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
