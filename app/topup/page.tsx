import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TopupClient from "./TopupClient";
import { Coins, History, Crown } from "lucide-react";
import { isVipActive } from "@/lib/coins";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "เติมเหรียญ | INKVERSE" };

export default async function TopupPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?callbackUrl=/topup");

  const userId = (session.user as { id: string }).id;

  const [userRow, packages, recentTx] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { coins: true, vipExpiresAt: true } }),
    prisma.coinPackage.findMany({ where: { isActive: true }, orderBy: { coins: "asc" } }),
    prisma.coinTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const userCoins = userRow?.coins ?? 0;
  const vipActive = isVipActive(userRow?.vipExpiresAt);
  const vipUntil = vipActive
    ? new Date(userRow!.vipExpiresAt!).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-bebas text-4xl text-[var(--text-primary)] tracking-wider flex items-center gap-3">
            <Coins className="w-8 h-8 text-[var(--text-primary)]" />
            เติมเหรียญ
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            ซื้อเหรียญเพื่อปลดล็อกตอน Premium
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-secondary)] mb-1">เหรียญของคุณ</p>
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-2xl justify-end">
            <Coins className="w-6 h-6" />
            <span>{userCoins.toLocaleString()}</span>
          </div>
          {vipActive && (
            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-[10px] font-semibold uppercase tracking-widest">
              <Crown className="w-3 h-3" />
              VIP ถึง {vipUntil}
            </div>
          )}
        </div>
      </div>

      {/* Packages */}
      <TopupClient packages={packages} />

      {/* Transaction history */}
      {recentTx.length > 0 && (
        <div className="mt-12">
          <h2 className="font-bebas text-2xl text-[var(--text-primary)] tracking-wider mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--text-primary)]" />
            ประวัติล่าสุด
          </h2>
          <div className="space-y-1">
            {recentTx.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]"
              >
                <div>
                  <p className="text-sm text-[var(--text-primary)]">{tx.description}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {new Date(tx.createdAt).toLocaleString("th-TH")}
                  </p>
                </div>
                <div
                  className={`flex items-center gap-1 font-semibold text-sm ${
                    tx.amount > 0 ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>{tx.amount > 0 ? "+" : ""}{tx.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
