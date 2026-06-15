import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { apiError } from "@/lib/apiError";

// Toggle following a creator. Body: { targetUserId }.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return apiError("AUTH-007", 401);

  const followerId = (session.user as { id: string }).id;
  const { targetUserId } = await req.json().catch(() => ({}));
  if (!targetUserId || typeof targetUserId !== "string" || targetUserId === followerId) {
    return apiError("VAL-001", 400, { message: "เป้าหมายไม่ถูกต้อง" });
  }

  const key = { followerId_followingId: { followerId, followingId: targetUserId } };
  const existing = await prisma.follow.findUnique({ where: key });

  let following: boolean;
  if (existing) {
    await prisma.follow.delete({ where: key });
    following = false;
  } else {
    try {
      await prisma.follow.create({ data: { followerId, followingId: targetUserId } });
    } catch {
      return apiError("VAL-002", 404, { message: "ไม่พบผู้ใช้เป้าหมาย" });
    }
    following = true;
    const followerName = (session.user as { username?: string; name?: string }).username
      ?? session.user.name ?? "ผู้ใช้";
    await createNotification({
      userId: targetUserId,
      type: "FOLLOW",
      title: "มีผู้ติดตามใหม่ 🎉",
      body: `@${followerName} เริ่มติดตามคุณแล้ว`,
      link: `/profile/${followerName}`,
    });
  }

  const followers = await prisma.follow.count({ where: { followingId: targetUserId } });
  return NextResponse.json({ following, followers });
}
