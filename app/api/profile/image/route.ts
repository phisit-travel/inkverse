import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";
import sharp from "sharp";

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

// Verify real image bytes (don't trust the filename / Content-Type).
function looksLikeImage(b: Buffer): boolean {
  if (b.length < 12) return false;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true; // JPEG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return true; // PNG
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return true; // GIF
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return true; // WEBP (RIFF....WEBP)
  return false;
}

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
  if (!looksLikeImage(buffer))
    return NextResponse.json({ error: "ไฟล์ไม่ใช่รูปภาพที่รองรับ" }, { status: 400 });

  let processed: Buffer;
  let key: string;
  try {
    if (type === "avatar") {
      processed = await sharp(buffer).resize(400, 400, { fit: "cover" }).webp({ quality: 85 }).toBuffer();
      key = `avatars/${userId}.webp`;
    } else {
      processed = await sharp(buffer).resize(1600, 500, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
      key = `profile-covers/${userId}.webp`;
    }
  } catch {
    return NextResponse.json({ error: "ประมวลผลรูปไม่สำเร็จ" }, { status: 400 });
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
