import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getReferralStats, REFERRAL_REWARD_COINS } from "@/lib/coins";
import ReferralLink from "@/components/ui/ReferralLink";
import { Users, Gift, Coins } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ชวนเพื่อน | INKVERSE" };

export default async function ReferralPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?callbackUrl=/referral");

  const userId = (session.user as { id: string }).id;
  const stats = await getReferralStats(userId);

  const cards = [
    { icon: Users, label: "เพื่อนที่เชิญ", value: stats.total },
    { icon: Gift, label: "เติมเงินแล้ว", value: stats.rewarded },
    { icon: Coins, label: "เหรียญที่ได้", value: stats.coinsEarned },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-bebas text-4xl text-[var(--text-primary)] tracking-wider mb-1">
        ชวนเพื่อน
      </h1>
      <p className="text-[var(--text-secondary)] text-sm mb-8">
        เมื่อเพื่อนสมัครผ่านลิงก์ของคุณและเติมเงินครั้งแรก
        คุณและเพื่อนรับคนละ {REFERRAL_REWARD_COINS} เหรียญทันที
      </p>

      {/* Link */}
      <div className="mb-8">
        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-2">
          ลิงก์ชวนเพื่อนของคุณ
        </p>
        <ReferralLink code={stats.code} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-[var(--bg-surface)] border border-[var(--border)] p-4 text-center"
          >
            <c.icon className="w-5 h-5 mx-auto mb-2 text-[var(--text-primary)]" />
            <p className="font-bebas text-3xl text-[var(--text-primary)] tracking-wider">
              {c.value.toLocaleString()}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mt-1">
              {c.label}
            </p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="mt-10 border border-[var(--border)] p-5">
        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-3">
          วิธีการ
        </p>
        <ol className="space-y-2 text-sm text-[var(--text-primary)]">
          <li>1. ส่งลิงก์ด้านบนให้เพื่อน</li>
          <li>2. เพื่อนสมัครสมาชิกผ่านลิงก์ (รับ 20 เหรียญต้อนรับ)</li>
          <li>3. เพื่อนเติมเงินครั้งแรก → คุณและเพื่อนรับคนละ {REFERRAL_REWARD_COINS} เหรียญ</li>
        </ol>
      </div>
    </div>
  );
}
