import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://inksverse.com";

// Email verification link target. Verifies the inbox → enables password login.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(`${BASE_URL}/auth/signin?verify=invalid`);

  const row = await prisma.emailVerificationToken.findUnique({
    where: { token },
    select: { id: true, userId: true, expires: true },
  });
  if (!row || row.expires < new Date()) {
    return NextResponse.redirect(`${BASE_URL}/auth/signin?verify=expired`);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: row.userId } }),
  ]);

  return NextResponse.redirect(`${BASE_URL}/auth/signin?verify=success`);
}
