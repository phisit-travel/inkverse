import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per page

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "TRANSLATOR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const chapterId = formData.get("chapterId") as string;
  const files = formData.getAll("files") as File[];
  // Pages are uploaded one (or a few) at a time to stay under the serverless
  // request-body limit; startPage tells us where this batch begins.
  const startPage = Number(formData.get("startPage")) || 1;

  if (!chapterId || files.length === 0) {
    return NextResponse.json(
      { error: "chapterId and files required" },
      { status: 400 }
    );
  }

  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const isR2Ready = !!(
    process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME &&
    process.env.CLOUDFLARE_R2_PUBLIC_URL
  );

  if (!isR2Ready) {
    const placeholders = [];
    for (let i = 0; i < files.length; i++) {
      const pageNum = startPage + i;
      const url = `https://picsum.photos/seed/${chapterId}-${pageNum}/800/1200`;
      await prisma.page.upsert({
        where: { chapterId_pageNum: { chapterId, pageNum } },
        create: { chapterId, pageNum, imageUrl: url, width: 800, height: 1200 },
        update: { imageUrl: url },
      });
      placeholders.push({ pageNum, imageUrl: url, width: 800, height: 1200 });
    }
    return NextResponse.json({ pages: placeholders, count: placeholders.length, note: "placeholder images (R2 not configured)" });
  }

  const results: { pageNum: number; imageUrl: string; width: number; height: number }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const pageNum = startPage + i;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `หน้า ${pageNum} ใหญ่เกิน 10MB` }, { status: 413 });
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const image = sharp(buffer);
      const meta = await image.metadata();
      const webpBuffer = await image.webp({ quality: 85 }).toBuffer();

      const key = `pages/${chapterId}/${pageNum}.webp`;
      const url = await uploadToR2(key, webpBuffer, "image/webp");

      await prisma.page.upsert({
        where: { chapterId_pageNum: { chapterId, pageNum } },
        create: {
          chapterId,
          pageNum,
          imageUrl: url,
          width: meta.width ?? null,
          height: meta.height ?? null,
        },
        update: { imageUrl: url, width: meta.width ?? null, height: meta.height ?? null },
      });

      results.push({
        pageNum,
        imageUrl: url,
        width: meta.width ?? 0,
        height: meta.height ?? 0,
      });
    } catch {
      return NextResponse.json(
        { error: `ประมวลผลหน้า ${pageNum} ไม่สำเร็จ (ไฟล์อาจเสียหรือไม่ใช่รูปภาพ)` },
        { status: 422 }
      );
    }
  }

  return NextResponse.json({ pages: results, count: results.length });
}
