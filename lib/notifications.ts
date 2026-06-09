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
