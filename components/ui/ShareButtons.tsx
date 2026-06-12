"use client";

import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const text = `อ่าน ${title} ที่ INKVERSE`;

  const links = [
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: "LINE", href: `https://social-plugins.line.me/lineit/share?url=${enc(url)}&text=${enc(text)}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  const chip = "px-3 py-1.5 border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/50 transition-colors rounded";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
        <Share2 className="w-3.5 h-3.5" /> แชร์
      </span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={chip}>
          {l.label}
        </a>
      ))}
      <button onClick={copy} className={`${chip} inline-flex items-center gap-1`}>
        {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
        {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
      </button>
    </div>
  );
}
