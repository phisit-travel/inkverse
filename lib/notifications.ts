import { prisma } from "./prisma";

export async function createNotification({
  userId,
  type,
  title,
  body,
  link,
}: {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}) {
  try {
    await prisma.notification.create({ data: { userId, type, title, body, link } });
  } catch {
    // non-critical — don't crash the caller
  }
}

/**
 * Notify a new chapter to: everyone who bookmarked the manga AND everyone who
 * follows the creator (deduped, creator excluded). The follower path is what
 * makes following a creator a real retention loop — and it covers "new work"
 * too (a creator's followers get pinged on the first chapter of a new title).
 * One bulk insert — cheap even for thousands of recipients.
 */
export async function notifyNewChapter(opts: {
  mangaId: string;
  mangaTitle: string;
  mangaSlug: string;
  chapterNum: number;
}) {
  try {
    const [bookmarks, manga] = await Promise.all([
      prisma.bookmark.findMany({ where: { mangaId: opts.mangaId }, select: { userId: true } }),
      prisma.manga.findUnique({ where: { id: opts.mangaId }, select: { translator: { select: { userId: true } } } }),
    ]);

    const creatorUserId = manga?.translator?.userId ?? null;
    let followerIds: string[] = [];
    if (creatorUserId) {
      const follows = await prisma.follow.findMany({
        where: { followingId: creatorUserId },
        select: { followerId: true },
      });
      followerIds = follows.map((f) => f.followerId);
    }

    // Bookmarkers + followers, deduped, and never notify the creator themselves.
    const userIds = [...new Set([...bookmarks.map((b) => b.userId), ...followerIds])].filter(
      (id) => id !== creatorUserId
    );
    if (userIds.length === 0) return;

    const link = `/content/${opts.mangaSlug}/${opts.chapterNum}`;
    const body = `${opts.mangaTitle} ตอนที่ ${opts.chapterNum} ออกแล้ว`;
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, type: "NEW_CHAPTER", title: "มีตอนใหม่!", body, link })),
    });

    // Push to the Android app too (lazy import; no-op if Firebase isn't set up).
    try {
      const { sendPushToUsers } = await import("./push");
      await sendPushToUsers(userIds, "มีตอนใหม่!", body, link);
    } catch {
      /* push is optional */
    }
  } catch {
    // non-critical
  }
}

/** Send a notification to every admin (e.g. a new contact message). */
export async function notifyAdmins(opts: { type: string; title: string; body: string; link?: string }) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    if (admins.length === 0) return;
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        link: opts.link,
      })),
    });
  } catch {
    // non-critical
  }
}

// Below this many coins we nudge the reader to top up (once per day max).
export const LOW_COINS_THRESHOLD = 10;

/**
 * Fire a one-per-day "coins running low" nudge after a spend leaves the reader
 * below the threshold. Deduped by checking for a recent LOW_COINS notification.
 */
export async function maybeNotifyLowCoins(userId: string, coinsLeft: number) {
  if (coinsLeft >= LOW_COINS_THRESHOLD) return;
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await prisma.notification.findFirst({
      where: { userId, type: "LOW_COINS", createdAt: { gte: since } },
      select: { id: true },
    });
    if (recent) return;
    await prisma.notification.create({
      data: {
        userId,
        type: "LOW_COINS",
        title: "เหรียญใกล้หมด",
        body: `เหลือ ${coinsLeft} เหรียญ เติมเลยเพื่อปลดล็อกตอนต่อไป`,
        link: "/topup",
      },
    });
  } catch {
    // non-critical
  }
}
