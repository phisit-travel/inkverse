"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";

interface CoinBadgeProps {
  initialCoins?: number;
}

export default function CoinBadge({ initialCoins = 0 }: CoinBadgeProps) {
  const [coins, setCoins] = useState(initialCoins);

  // Refresh balance when the tab regains focus (e.g. after topup)
  useEffect(() => {
    async function refresh() {
      try {
        const res = await fetch("/api/coin/balance");
        if (res.ok) {
          const data = await res.json();
          setCoins(data.coins);
        }
      } catch {
        // silent
      }
    }

    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  return (
    <Link
      href="/topup"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors text-sm font-medium"
    >
      <Coins className="w-4 h-4" />
      <span>{coins.toLocaleString()}</span>
    </Link>
  );
}
