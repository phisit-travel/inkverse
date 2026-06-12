"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Share2 } from "lucide-react";

export default function ReferralLink({ code }: { code: string }) {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setLink(`${window.location.origin}/auth/signup?ref=${code}`);
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, [code]);

  const shareText = "มาอ่านมังงะ & นิยายแปลไทยที่ INKVERSE กัน! สมัครผ่านลิงก์นี้รับ 20 เหรียญฟรีเลย";
  const enc = encodeURIComponent;
  const shares = [
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(link)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}` },
    { label: "LINE", href: `https://social-plugins.line.me/lineit/share?url=${enc(link)}&text=${enc(shareText)}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: "INKVERSE", text: shareText, url: link });
    } catch {
      /* user cancelled */
    }
  }

  const chip = "px-3 py-2 border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/50 transition-colors rounded";

  return (
    <div className="space-y-2.5">
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

      <div className="flex flex-wrap items-center gap-2">
        {canNativeShare && (
          <button onClick={nativeShare} className={`${chip} inline-flex items-center gap-1.5 text-[var(--text-primary)] border-[var(--text-primary)]/40`}>
            <Share2 className="w-3.5 h-3.5" /> แชร์เลย
          </button>
        )}
        {shares.map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className={chip}>
            {s.label}
          </a>
        ))}
      </div>
    </div>
  );
}
