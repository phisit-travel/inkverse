import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { renderNovel } from "@/lib/markdown";
import { apiError } from "@/lib/apiError";

// Renders markdown → the exact sanitized HTML the reader shows. Creators only.
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = session?.user ? (session.user as { role?: string }).role : undefined;
  if (role !== "TRANSLATOR" && role !== "ADMIN") {
    return apiError("AUTH-008", 403);
  }
  const { content } = await req.json().catch(() => ({ content: "" }));
  return NextResponse.json({ html: renderNovel(typeof content === "string" ? content.slice(0, 200000) : "") });
}
