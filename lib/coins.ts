import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

// Tiered discount for unlocking many chapters at once — encourages spending the
// whole balance in one go (raises coins-used). Kept in sync with the UI hint in
// components/ui/BulkUnlock.tsx.
export function bulkDiscountRate(count: number): number {
  if (count >= 50) return 0.15;
  if (count >= 20) return 0.10;
  if (count >= 10) return 0.05;
  return 0;
}

// VIP perks (30-day pass, no auto-renew): a monthly coin stipend + this discount
// on every unlock. Discounts are always margin-safe — they reduce the reader's
// charge and the translator's 80% share proportionally; platform keeps 20%.
export const VIP_UNLOCK_DISCOUNT = 0.10;
export const VIP_DEFAULT_DAYS = 30;

export function isVipActive(vipExpiresAt: Date | null | undefined): boolean {
  return !!vipExpiresAt && vipExpiresAt.getTime() > Date.now();
}

// Extend a user's VIP window by `days`, stacking onto any remaining time.
// Call inside the same transaction that credits the purchase.
export async function extendVipDays(
  tx: Prisma.TransactionClient,
  userId: string,
  days: number
): Promise<void> {
  const u = await tx.user.findUnique({
    where: { id: userId },
    select: { vipExpiresAt: true },
  });
  const base =
    u?.vipExpiresAt && u.vipExpiresAt.getTime() > Date.now()
      ? u.vipExpiresAt.getTime()
      : Date.now();
  const expires = new Date(base + days * 24 * 60 * 60 * 1000);
  await tx.user.update({ where: { id: userId }, data: { vipExpiresAt: expires } });
}

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

const TRANSLATOR_SHARE = 0.80; // 80% to translator, 20% platform fee

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
    select: { coins: true, vipExpiresAt: true },
  });
  // VIP readers get a discount on the coin cost.
  const vipRate = isVipActive(user?.vipExpiresAt) ? VIP_UNLOCK_DISCOUNT : 0;
  const cost = Math.round(chapter.coinCost * (1 - vipRate));
  if (!user || user.coins < cost) {
    return { success: false, error: "INSUFFICIENT_COINS" };
  }

  const translatorId = chapter.manga?.translatorId ?? null;
  const earningAmount = parseFloat((cost * TRANSLATOR_SHARE).toFixed(2));

  const updatedUser = await prisma.$transaction(async (tx) => {
    // Conditional decrement guards against double-spend / negative balance when
    // two unlocks (of different chapters) race — the pre-check above is outside
    // the tx, so without this guard both could pass and drive coins negative.
    // Mirrors unlockChaptersBulk.
    const dec = await tx.user.updateMany({
      where: { id: userId, coins: { gte: cost } },
      data: { coins: { decrement: cost } },
    });
    if (dec.count === 0) return null;
    // skipDuplicates makes a same-chapter race a no-op instead of a 500; if it
    // didn't insert, another request already unlocked it — roll back the charge.
    const ins = await tx.unlockedChapter.createMany({
      data: [{ userId, chapterId, coinSpent: cost }],
      skipDuplicates: true,
    });
    if (ins.count === 0) throw new Error("ALREADY_UNLOCKED_RACE");
    await tx.coinTransaction.create({
      data: {
        userId,
        amount: -cost,
        type: "SPEND",
        description:
          vipRate > 0
            ? `ปลดล็อกตอนที่ ${chapter.chapterNum} (VIP ลด 10%)`
            : `ปลดล็อกตอนที่ ${chapter.chapterNum}`,
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
          coinsSpent: cost,
          amount: earningAmount,
        },
      });
    }
    return tx.user.findUnique({ where: { id: userId }, select: { coins: true } });
  }).catch((err: unknown) => {
    // A racing unlock of the same chapter already won → treat as already unlocked.
    if (err instanceof Error && err.message === "ALREADY_UNLOCKED_RACE") return "RACE" as const;
    throw err;
  });

  if (updatedUser === "RACE") return { success: false, error: "ALREADY_UNLOCKED" };
  if (!updatedUser) return { success: false, error: "INSUFFICIENT_COINS" };
  return { success: true, coinsLeft: updatedUser.coins };
}

export type BulkUnlockResult =
  | {
      success: true;
      unlockedCount: number;
      coinsSpent: number;
      coinsSaved: number;
      discountRate: number;
      coinsLeft: number;
    }
  | { success: false; error: "NOTHING_TO_UNLOCK" | "INSUFFICIENT_COINS" };

/**
 * Unlock several premium chapters at once. Skips chapters that aren't premium
 * or are already unlocked, charges the combined cost atomically, and credits
 * each chapter's translator their share.
 */
export async function unlockChaptersBulk(
  userId: string,
  chapterIds: string[],
  _retry = false
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

  const buyer = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipExpiresAt: true },
  });
  const vipRate = isVipActive(buyer?.vipExpiresAt) ? VIP_UNLOCK_DISCOUNT : 0;
  const rawCost = toUnlock.reduce((sum, c) => sum + c.coinCost, 0);
  const discountRate = bulkDiscountRate(toUnlock.length);
  // Bulk + VIP discounts stack multiplicatively. `keep` = fraction the user pays.
  // Translator earns on the discounted amount too (prorated per chapter) so the
  // platform's margin never goes negative.
  const keep = (1 - discountRate) * (1 - vipRate);
  const totalCost = Math.round(rawCost * keep);
  const coinsSaved = rawCost - totalCost;

  const result = await prisma.$transaction(async (tx) => {
    // Conditional decrement guards against double-spend / negative balance.
    const dec = await tx.user.updateMany({
      where: { id: userId, coins: { gte: totalCost } },
      data: { coins: { decrement: totalCost } },
    });
    if (dec.count === 0) return null;

    const ins = await tx.unlockedChapter.createMany({
      data: toUnlock.map((c) => ({
        userId,
        chapterId: c.id,
        coinSpent: Math.round(c.coinCost * keep),
      })),
      skipDuplicates: true,
    });
    // If a concurrent unlock (or a double-click) already owns some of these, the
    // skipped rows would be charged for nothing → roll the whole charge back and
    // retry with a fresh ownership filter, so the user can never overpay and the
    // translator never gets a duplicate earning.
    if (ins.count < toUnlock.length) throw new Error("UNLOCK_RACE");
    await tx.coinTransaction.create({
      data: {
        userId,
        amount: -totalCost,
        type: "SPEND",
        description:
          coinsSaved > 0
            ? `ปลดล็อก ${toUnlock.length} ตอน (ลด ${Math.round((1 - keep) * 100)}%${vipRate > 0 ? " · VIP" : ""})`
            : `ปลดล็อก ${toUnlock.length} ตอน`,
        refId: toUnlock[0].mangaId,
      },
    });
    const earnings = toUnlock
      .filter((c) => c.manga?.translatorId)
      .map((c) => {
        const charged = Math.round(c.coinCost * keep);
        return {
          translatorId: c.manga!.translatorId!,
          chapterId: c.id,
          mangaId: c.mangaId,
          userId,
          coinsSpent: charged,
          amount: parseFloat((charged * TRANSLATOR_SHARE).toFixed(2)),
        };
      });
    if (earnings.length) await tx.translatorEarning.createMany({ data: earnings });

    const u = await tx.user.findUnique({ where: { id: userId }, select: { coins: true } });
    return u;
  }).catch((err: unknown) => {
    if (err instanceof Error && err.message === "UNLOCK_RACE") return "RACE" as const;
    throw err;
  });

  // A concurrent unlock won the race for some chapters → recompute ownership and
  // retry once so we only ever charge for what we actually unlock.
  if (result === "RACE") {
    return _retry
      ? { success: false, error: "NOTHING_TO_UNLOCK" }
      : unlockChaptersBulk(userId, chapterIds, true);
  }
  if (!result) return { success: false, error: "INSUFFICIENT_COINS" };
  return {
    success: true,
    unlockedCount: toUnlock.length,
    coinsSpent: totalCost,
    coinsSaved,
    discountRate,
    coinsLeft: result.coins,
  };
}

// ── Buy the whole book (bundle) ──────────────────────────────────────────────
export type BuyBookResult =
  | { success: true; unlockedCount: number; coinsSpent: number; coinsLeft: number; alreadyOwned?: boolean }
  | { success: false; error: "NOT_FOUND" | "NOT_FOR_SALE" | "NOTHING_TO_UNLOCK" | "INSUFFICIENT_COINS" };

/**
 * Buy a whole work in ONE purchase: unlock every currently-locked premium chapter
 * at the creator's bundle price (Manga.bookPrice). Money-safe — mirrors
 * unlockChaptersBulk: price is derived SERVER-SIDE from bookPrice (client sends
 * only mangaId), the coin decrement is atomic + conditional (no negative balance
 * / double-spend), it's idempotent (already owns the book ⇒ no charge), and a
 * mid-flight race rolls back + retries once. Creator earns the usual 80%.
 *
 * "Whole book" = all chapters that exist NOW. New chapters added later are not
 * included (they'd be unlocked/bought separately) — the UI labels this.
 */
export async function buyBook(
  userId: string,
  mangaId: string,
  _retry = false
): Promise<BuyBookResult> {
  const manga = await prisma.manga.findUnique({
    where: { id: mangaId },
    select: { id: true, bookPrice: true, published: true, translatorId: true },
  });
  if (!manga || !manga.published) return { success: false, error: "NOT_FOUND" };
  if (manga.bookPrice == null || manga.bookPrice <= 0)
    return { success: false, error: "NOT_FOR_SALE" };

  // Currently-locked premium chapters: live (not draft / past publishAt) AND still
  // paid (no freeAt, or freeAt in the future). Free + early-access-elapsed chapters
  // are already readable, so they're never part of the charge. (Two OR groups go
  // under AND so they don't collide on the same `OR` key.)
  const now = new Date();
  const chapters = await prisma.chapter.findMany({
    where: {
      mangaId,
      isPremium: true,
      status: { not: "DRAFT" },
      AND: [
        { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
        { OR: [{ freeAt: null }, { freeAt: { gt: now } }] },
      ],
    },
    select: { id: true },
  });
  const lockedIds = chapters.map((c) => c.id);
  if (lockedIds.length === 0) return { success: false, error: "NOTHING_TO_UNLOCK" };

  const owned = await prisma.unlockedChapter.findMany({
    where: { userId, chapterId: { in: lockedIds } },
    select: { chapterId: true },
  });
  const ownedSet = new Set(owned.map((o) => o.chapterId));
  const toUnlock = lockedIds.filter((id) => !ownedSet.has(id));

  // Idempotent: already owns every (current) chapter → don't charge again.
  if (toUnlock.length === 0) {
    return { success: true, unlockedCount: 0, coinsSpent: 0, alreadyOwned: true, coinsLeft: await getUserCoins(userId) };
  }

  const buyer = await prisma.user.findUnique({ where: { id: userId }, select: { vipExpiresAt: true } });
  const vipRate = isVipActive(buyer?.vipExpiresAt) ? VIP_UNLOCK_DISCOUNT : 0;
  // Bundle price is the fixed bookPrice (NOT a per-chapter sum); VIP discount
  // applies on top, same as unlocks, keeping the platform margin safe.
  const price = Math.round(manga.bookPrice * (1 - vipRate));

  const result = await prisma.$transaction(async (tx) => {
    const dec = await tx.user.updateMany({
      where: { id: userId, coins: { gte: price } },
      data: { coins: { decrement: price } },
    });
    if (dec.count === 0) return null; // insufficient / lost the balance race
    const ins = await tx.unlockedChapter.createMany({
      // Per-chapter coinSpent 0: this is a single bundle sale; the real charge is
      // on the SPEND transaction + the single TranslatorEarning below.
      data: toUnlock.map((id) => ({ userId, chapterId: id, coinSpent: 0 })),
      skipDuplicates: true,
    });
    // Someone unlocked some of these mid-flight → we'd charge full price for fewer
    // chapters. Roll back and retry once with a fresh ownership filter.
    if (ins.count < toUnlock.length) throw new Error("BOOK_RACE");
    await tx.coinTransaction.create({
      data: {
        userId,
        amount: -price,
        type: "SPEND",
        description: vipRate > 0
          ? `ซื้อทั้งเล่ม (${toUnlock.length} ตอน · VIP ลด 10%)`
          : `ซื้อทั้งเล่ม (${toUnlock.length} ตอน)`,
        refId: `book:${mangaId}`,
      },
    });
    if (manga.translatorId) {
      await tx.translatorEarning.create({
        data: {
          translatorId: manga.translatorId,
          chapterId: null,
          mangaId,
          userId,
          coinsSpent: price,
          amount: parseFloat((price * TRANSLATOR_SHARE).toFixed(2)),
        },
      });
    }
    return tx.user.findUnique({ where: { id: userId }, select: { coins: true } });
  }).catch((err: unknown) => {
    if (err instanceof Error && err.message === "BOOK_RACE") return "RACE" as const;
    throw err;
  });

  if (result === "RACE") {
    return _retry ? { success: false, error: "NOTHING_TO_UNLOCK" } : buyBook(userId, mangaId, true);
  }
  if (!result) return { success: false, error: "INSUFFICIENT_COINS" };
  return { success: true, unlockedCount: toUnlock.length, coinsSpent: price, coinsLeft: result.coins };
}

// ── Tipping a translator ─────────────────────────────────────────────────────
export const TIP_TRANSLATOR_SHARE = 0.90; // tips are a gift → translator keeps 90%

export type TipResult =
  | { success: true; coinsLeft: number; amountThb: number }
  | { success: false; error: "INVALID_AMOUNT" | "INSUFFICIENT_COINS" | "TRANSLATOR_NOT_FOUND" | "SELF_TIP" };

/**
 * Tip a translator with coins. Deducts the reader's coins and credits the
 * translator a TIP earning (90% share). Atomic + guarded against overspend.
 */
export async function tipTranslator(
  userId: string,
  translatorId: string,
  coins: number
): Promise<TipResult> {
  if (!Number.isInteger(coins) || coins < 1 || coins > 100000) {
    return { success: false, error: "INVALID_AMOUNT" };
  }
  const translator = await prisma.translator.findUnique({
    where: { id: translatorId },
    select: { id: true, userId: true, penName: true },
  });
  if (!translator) return { success: false, error: "TRANSLATOR_NOT_FOUND" };
  if (translator.userId === userId) return { success: false, error: "SELF_TIP" };

  const amountThb = parseFloat((coins * TIP_TRANSLATOR_SHARE).toFixed(2));

  const result = await prisma.$transaction(async (tx) => {
    const dec = await tx.user.updateMany({
      where: { id: userId, coins: { gte: coins } },
      data: { coins: { decrement: coins } },
    });
    if (dec.count === 0) return null;

    await tx.coinTransaction.create({
      data: {
        userId,
        amount: -coins,
        type: "SPEND",
        description: `ทิปนักแปล ${translator.penName}`,
        refId: `tip:${translatorId}`,
      },
    });
    await tx.translatorEarning.create({
      data: {
        translatorId,
        chapterId: null,
        mangaId: null,
        userId,
        type: "TIP",
        coinsSpent: coins,
        amount: amountThb,
      },
    });
    return tx.user.findUnique({ where: { id: userId }, select: { coins: true } });
  });

  if (!result) return { success: false, error: "INSUFFICIENT_COINS" };
  return { success: true, coinsLeft: result.coins, amountThb };
}

// ── Translator identity verification (paid + admin-approved) ─────────────────
export const VERIFY_FEE_COINS = 500;

export type VerifyRequestResult =
  | { success: true }
  | { success: false; error: "NOT_TRANSLATOR" | "ALREADY_VERIFIED" | "PENDING_EXISTS" | "INSUFFICIENT_COINS" };

/**
 * Submit a verification request. Charges VERIFY_FEE_COINS up front (refunded on
 * rejection). Translator-only, one active request at a time; a previously
 * rejected request can be re-submitted.
 */
export async function requestVerification(userId: string): Promise<VerifyRequestResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coins: true, verifiedAt: true, translator: { select: { id: true } } },
  });
  if (!user || !user.translator) return { success: false, error: "NOT_TRANSLATOR" };
  if (user.verifiedAt) return { success: false, error: "ALREADY_VERIFIED" };

  const existing = await prisma.verificationRequest.findUnique({ where: { userId } });
  if (existing && existing.status === "PENDING") return { success: false, error: "PENDING_EXISTS" };

  const ok = await prisma.$transaction(async (tx) => {
    const dec = await tx.user.updateMany({
      where: { id: userId, coins: { gte: VERIFY_FEE_COINS } },
      data: { coins: { decrement: VERIFY_FEE_COINS } },
    });
    if (dec.count === 0) return false;
    await tx.coinTransaction.create({
      data: {
        userId,
        amount: -VERIFY_FEE_COINS,
        type: "SPEND",
        description: "ค่าธรรมเนียมยืนยันตัวตน",
        refId: `verify:${userId}`,
      },
    });
    await tx.verificationRequest.upsert({
      where: { userId },
      create: { userId, status: "PENDING", coinsPaid: VERIFY_FEE_COINS },
      update: { status: "PENDING", coinsPaid: VERIFY_FEE_COINS, adminNote: null, reviewedAt: null, createdAt: new Date() },
    });
    return true;
  });
  if (!ok) return { success: false, error: "INSUFFICIENT_COINS" };
  return { success: true };
}

/**
 * Admin decision on a verification request. Approve → set user.verifiedAt.
 * Reject → refund the fee. Returns the affected userId, or null if not pending.
 */
export async function reviewVerification(
  requestId: string,
  approve: boolean,
  note?: string
): Promise<string | null> {
  const reqRow = await prisma.verificationRequest.findUnique({ where: { id: requestId } });
  if (!reqRow || reqRow.status !== "PENDING") return null;

  const done = await prisma.$transaction(async (tx) => {
    // Atomic guard: only the first reviewer flips PENDING → decision, so a
    // double-click (or two admins) can't approve twice or double-refund the fee.
    const flip = await tx.verificationRequest.updateMany({
      where: { id: requestId, status: "PENDING" },
      data: { status: approve ? "APPROVED" : "REJECTED", reviewedAt: new Date(), adminNote: note ?? null },
    });
    if (flip.count === 0) return false;

    if (approve) {
      await tx.user.update({ where: { id: reqRow.userId }, data: { verifiedAt: new Date() } });
    } else {
      await tx.user.update({ where: { id: reqRow.userId }, data: { coins: { increment: reqRow.coinsPaid } } });
      await tx.coinTransaction.create({
        data: {
          userId: reqRow.userId,
          amount: reqRow.coinsPaid,
          type: "REFUND",
          description: "คืนค่าธรรมเนียมยืนยันตัวตน (ไม่ผ่าน)",
          refId: `verify-refund:${reqRow.userId}`,
        },
      });
    }
    return true;
  });

  return done ? reqRow.userId : null;
}
