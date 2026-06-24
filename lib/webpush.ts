import webpush, { WebPushError } from "web-push";
import { prisma } from "./prisma";

// Web Push is optional: if the VAPID keys aren't set the whole thing no-ops, so
// the deploy keeps working without any push config (mirrors lib/push.ts / FCM).
let configured: boolean | null = null;
function ensure(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@inksverse.com";
  if (!pub || !priv) {
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  } catch {
    configured = false;
  }
  return configured;
}

/**
 * Push a notification to every web (browser) subscription of the given users.
 * Prunes subscriptions the push service reports as gone (404/410). Best-effort:
 * never throws — a push failure must not break the request that triggered it.
 */
export async function sendWebPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  link = "/"
): Promise<void> {
  if (!ensure() || userIds.length === 0) return;
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    select: { endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body, link });
  const dead: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 24 * 60 * 60 }
        );
      } catch (e) {
        // 404 = endpoint unknown, 410 = subscription expired/unsubscribed → drop it.
        const code = e instanceof WebPushError ? e.statusCode : 0;
        if (code === 404 || code === 410) dead.push(s.endpoint);
      }
    })
  );
  if (dead.length) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: dead } } });
  }
}
