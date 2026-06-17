"use client";

import { useState } from "react";
import { Download, ImageIcon, ExternalLink } from "lucide-react";

type Fmt = "square" | "story" | "wide";

const FORMATS: { fmt: Fmt; label: string; size: string }[] = [
  { fmt: "square", label: "จัตุรัส (IG / FB)", size: "1080×1080" },
  { fmt: "story", label: "Story / TikTok", size: "1080×1920" },
  { fmt: "wide", label: "แนวนอน (X / ลิงก์การ์ด)", size: "1200×630" },
];

function DownloadBtn({ fmt, label, size }: { fmt: Fmt; label: string; size: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch(`/api/promo/toolkit?format=${fmt}`);
          if (!res.ok) throw new Error();
          const blob = await res.blob();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `inkverse-toolkit-${fmt}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(a.href);
        } catch {} finally {
          setBusy(false);
        }
      }}
      className="flex items-center justify-between gap-3 border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-left hover:border-[var(--text-primary)]/50 transition-colors rounded-xl disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--text-primary)] truncate">{label}</span>
        <span className="block text-[11px] text-[var(--text-muted)]">{size}</span>
      </span>
      <Download className="w-4 h-4 text-[var(--text-primary)] shrink-0" />
      {busy && <span className="text-[10px] text-[var(--text-muted)]">…</span>}
    </button>
  );
}

export default function ToolkitBannerDownloads() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-5 mb-10">
      <div className="flex items-center gap-2 mb-1">
        <ImageIcon className="w-5 h-5 text-[var(--text-primary)]" />
        <h3 className="font-semibold text-[var(--text-primary)]">แบนเนอร์โปรโมท toolkit นักเขียน</h3>
      </div>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        ดาวน์โหลดรูปแบนเนอร์ &ldquo;เครื่องมือนักเขียนระดับโปร&rdquo; ไปโพสต์โปรโมทบน IG / Facebook / TikTok / X
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {FORMATS.map((f) => (
          <DownloadBtn key={f.fmt} {...f} />
        ))}
      </div>
      <a
        href="/api/promo/toolkit?format=square"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mt-3"
      >
        <ExternalLink className="w-3.5 h-3.5" /> ดูตัวอย่าง
      </a>
    </div>
  );
}
