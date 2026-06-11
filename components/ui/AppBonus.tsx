"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";

// Runs only inside the Capacitor Android app: claims the one-time install bonus.
export default function AppBonus() {
  const [granted, setGranted] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const inApp = !!(window as unknown as { Capacitor?: unknown }).Capacitor;
    if (!inApp) return;
    if (localStorage.getItem("ivAppBonus")) return;
    localStorage.setItem("ivAppBonus", "1");
    fetch("/api/app/claim-bonus", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { if (d?.granted > 0) setGranted(d.granted); })
      .catch(() => {});
  }, []);

  if (!granted) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm font-semibold rounded shadow-lg">
      <Coins className="w-4 h-4" /> รับ {granted} เหรียญฟรีจากแอป!
    </div>
  );
}
