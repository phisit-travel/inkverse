import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserCoins } from "@/lib/coins";
import TopupClient from "./TopupClient";
import { Coins, History } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "เติมเหรียญ | INKVERSE" };

export default async function TopupPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?callbackUrl=/topup");

  const userId = (session.user as { id: string }).id;

  const [userCoins, packages, recentTx] = await Promise.all([
    getUserCoins(userId),
    prisma.coinPackage.findMany({ where: { isActive: true }, orderBy: { coins: "asc" } }),
    prisma.coinTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-bebas text-4xl text-white tracking-wider flex items-center gap-3">
            <Coins className="w-8 h-8 text-yellow-400" />
            เติมเหรียญ
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            ซื้อเหรียญเพื่อปลดล็อกตอน Premium
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">เหรียญของคุณ</p>
          <div className="flex items-center gap-2 text-yellow-400 font-bold text-2xl">
            <Coins className="w-6 h-6" />
            <span>{userCoins.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Packages */}
      <TopupClient packages={packages} />

      {/* Transaction history */}
      {recentTx.length > 0 && (
        <div className="mt-12">
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-[#ff2d55]" />
            ประวัติล่าสุด
          </h2>
          <div className="space-y-1">
            {recentTx.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-4 py-3 bg-[#141720] rounded-xl border border-white/5"
              >
                <div>
                  <p className="text-sm text-white">{tx.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(tx.createdAt).toLocaleString("th-TH")}
                  </p>
                </div>
                <div
                  className={`flex items-center gap-1 font-semibold text-sm ${
                    tx.amount > 0 ? "text-green-400" : "text-red-400"
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
