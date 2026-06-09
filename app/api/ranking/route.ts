import { NextRequest, NextResponse } from "next/server";
import { getRanking, recalculateRanking } from "@/lib/ranking";
import { auth } from "@/lib/auth";

type StatPeriod = "WEEK" | "MONTH" | "ALL";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const period = (searchParams.get("period")?.toUpperCase() || "WEEK") as StatPeriod;
  const limit = Number(searchParams.get("limit")) || 10;
  const recalculate = searchParams.get("recalculate") === "1";

  const validPeriods: StatPeriod[] = ["WEEK", "MONTH", "ALL"];
  if (!validPeriods.includes(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  if (recalculate) {
    const session = await auth();
    if ((session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
