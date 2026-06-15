import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";

const SOCIAL_KEYS = ["facebook", "x", "youtube", "tiktok", "discord", "website"] as const;

// Update the signed-in creator's bio + social links.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return apiError("AUTH-007", 401);
  const role = (session.user as { role?: string }).role;
  if (role !== "TRANSLATOR" && role !== "ADMIN") {
    return apiError("AUTH-008", 403);
  }
  const userId = (session.user as { id: string }).id;
  const translator = await prisma.translator.findUnique({ where: { userId } });
  if (!translator) return apiError("VAL-002", 404, { message: "ไม่พบโปรไฟล์ครีเอเตอร์" });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.bio === "string") data.bio = body.bio.slice(0, 500);

  if (body.socialLinks && typeof body.socialLinks === "object") {
    const clean: Record<string, string> = {};
    for (const k of SOCIAL_KEYS) {
      const v = body.socialLinks[k];
      if (typeof v === "string" && v.trim()) {
        const url = v.trim();
        if (/^https?:\/\//i.test(url)) clean[k] = url.slice(0, 300);
      }
    }
    data.socialLinks = clean;
  }

  await prisma.translator.update({ where: { userId }, data });
  return NextResponse.json({ ok: true });
}
