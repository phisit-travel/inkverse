import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/r2";
import { apiError } from "@/lib/apiError";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
  "image/webp": "webp", "image/gif": "gif", "image/avif": "avif",
};
const MAX = 8 * 1024 * 1024; // 8 MB

// Server-side upload of an inline novel illustration. Goes through our API (not
// a browser→R2 presigned PUT) so it never depends on R2 CORS. Keyed by manga so
// images can be inserted before the chapter is first saved.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return apiError("AUTH-007", 401);
  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id: string }).id;
  if (role !== "TRANSLATOR" && role !== "ADMIN") {
    return apiError("AUTH-008", 403);
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const mangaSlug = form?.get("mangaSlug");
  if (!(file instanceof File) || typeof mangaSlug !== "string") {
    return apiError("VAL-001", 400, { message: "กรุณาแนบรูป + mangaSlug" });
  }
  if (file.size > MAX) {
    return apiError("UP-003", 413, { message: "รูปใหญ่เกินไป (สูงสุด 8MB)" });
  }

  const manga = await prisma.manga.findUnique({
    where: { slug: mangaSlug },
    select: { id: true, translatorId: true },
  });
  if (!manga) return apiError("READ-004", 404);
  if (role !== "ADMIN") {
    const t = await prisma.translator.findUnique({ where: { userId } });
    if (!t || manga.translatorId !== t.id) {
      return apiError("UP-004", 403);
    }
  }

  const contentType = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";
  const ext = EXT[contentType] || "jpg";
  const key = `novel/${manga.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  try {
    const url = await uploadToR2(key, Buffer.from(await file.arrayBuffer()), contentType);
    return NextResponse.json({ url });
  } catch {
    return apiError("UP-002", 500, { message: "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่" });
  }
}
