import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserCoins } from "@/lib/coins";
import { apiError } from "@/lib/apiError";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return apiError("AUTH-007", 401);
  }

  const userId = (session.user as { id: string }).id;
  const coins = await getUserCoins(userId);
  return NextResponse.json({ coins });
}
