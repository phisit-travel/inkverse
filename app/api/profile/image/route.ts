import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";
import sharp from "sharp";

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const rl = rateLimit(`profile-image:${userId}`, 10, 60_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "ดำเนินการบ่อยเกินไป กรุณาลองใหม่" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const type = form.get("type") as string | null;

  if (!file || (type !== "avatar" && type !== "cover"))
    return NextResponse.json({ error: "file and type (avatar|cover) required" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป (สูงสุด 8MB)" }, { status: 413 });

  const r2Ready = !!(
    process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME &&
    process.env.CLOUDFLARE_R2_PUBLIC_URL
  );
  if (!r2Ready)
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่าที่เก็บไฟล์ (R2)" }, { status: 503 });

  const buffer = Buffer.from(await file.arrayBuffer());

  let processed: Buffer;
  let key: string;
  if (type === "avatar") {
    processed = await sharp(buffer).resize(400, 400, { fit: "cover" }).webp({ quality: 85 }).toBuffer();
    key = `avatars/${userId}.webp`;
  } else {
    processed = await sharp(buffer).resize(1600, 500, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
    key = `profile-covers/${userId}.webp`;
  }

  const base = await uploadToR2(key, processed, "image/webp");
  // Cache-bust so the new image shows immediately (same key overwrites).
  const url = `${base}?v=${Date.now()}`;

  await prisma.user.update({
    where: { id: userId },
    data: type === "avatar" ? { avatarUrl: url } : { coverUrl: url },
  });

  return NextResponse.json({ url, type });
}
