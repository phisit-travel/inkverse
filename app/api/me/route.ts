import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserCoins } from "@/lib/coins";
import { getUserRankBadge } from "@/lib/ranks";

// Per-user navbar state, fetched client-side so the root layout no longer has to
// call auth() on every page render. MUST be no-store — this body is per-user.
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { user: null, coins: 0, rankBadge: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const u = session.user as {
    id: string;
    username?: string | null;
    role?: string;
    image?: string | null;
    name?: string | null;
    email?: string | null;
  };

  const [coins, rankBadge] = await Promise.all([
    getUserCoins(u.id),
    getUserRankBadge(u.id, u.role),
  ]);

  return NextResponse.json(
    {
      user: {
        id: u.id,
        username: u.username ?? null,
        role: u.role ?? "USER",
        image: u.image ?? null,
        name: u.name ?? null,
        email: u.email ?? null,
      },
      coins,
      rankBadge,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
