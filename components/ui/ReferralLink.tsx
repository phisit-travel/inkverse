"use client";

import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";

export default function ReferralLink({ code }: { code: string }) {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLink(`${window.location.origin}/auth/signup?ref=${code}`);
  }, [code]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex items-stretch border border-[var(--border)]">
      <input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 bg-[var(--bg-card)] px-3 py-3 text-sm text-[var(--text-secondary)] focus:outline-none truncate"
      />
      <button
        onClick={copy}
        className="bal-btn px-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest shrink-0"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "คัดลอกแล้ว" : "คัดลอก"}
      </button>
    </div>
  );
}
