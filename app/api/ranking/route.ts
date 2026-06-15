import { NextRequest, NextResponse } from "next/server";
import { getRanking, recalculateRanking } from "@/lib/ranking";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/apiError";

type StatPeriod = "WEEK" | "MONTH" | "ALL";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const period = (searchParams.get("period")?.toUpperCase() || "WEEK") as StatPeriod;
  const limit = Number(searchParams.get("limit")) || 10;
  const recalculate = searchParams.get("recalculate") === "1";

  const validPeriods: StatPeriod[] = ["WEEK", "MONTH", "ALL"];
  if (!validPeriods.includes(period)) {
    return apiError("VAL-001", 400, { message: "ช่วงเวลาไม่ถูกต้อง" });
  }

  if (recalculate) {
    const session = await auth();
    if ((session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
      return apiError("AUTH-008", 403);
    }
    await Promise.all([
      recalculateRanking("WEEK"),
      recalculateRanking("MONTH"),
      recalculateRanking("ALL"),
    ]);
  }

  const data = await getRanking(period, limit);
  return NextResponse.json({ data, period });
}
