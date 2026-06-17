"use client";

import { useState } from "react";
import { Download, ImageIcon, ExternalLink, PenLine, Languages } from "lucide-react";

type Fmt = "square" | "story" | "wide";
type Role = "writer" | "tl";

const FORMATS: { fmt: Fmt; label: string; size: string }[] = [
  { fmt: "square", label: "จัตุรัส (IG / FB)", size: "1080×1080" },
  { fmt: "story", label: "Story / TikTok", size: "1080×1920" },
  { fmt: "wide", label: "แนวนอน (X / ลิงก์การ์ด)", size: "1200×630" },
];

const GROUPS: { role: Role; title: string; icon: typeof PenLine }[] = [
  { role: "writer", title: "แบนเนอร์ toolkit นักเขียน", icon: PenLine },
  { role: "tl", title: "แบนเนอร์ toolkit นักแปล", icon: Languages },
];

function url(role: Role, fmt: Fmt) {
  return `/api/promo/toolkit?format=${fmt}${role === "tl" ? "&role=tl" : ""}`;
}

function DownloadBtn({ role, fmt, label, size }: { role: Role; fmt: Fmt; label: string; size: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch(url(role, fmt));
          if (!res.ok) throw new Error();
          const blob = await res.blob();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `inkverse-toolkit-${role}-${fmt}.png`;
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
        <h3 className="font-semibold text-[var(--text-primary)]">แบนเนอร์โปรโมท toolkit ครีเอเตอร์</h3>
      </div>
      <p className="text-sm text-[var(--text-secondary)] mb-5">
        ดาวน์โหลดรูปแบนเนอร์ไปโพสต์โปรโมทบน IG / Facebook / TikTok / X
      </p>

      <div className="space-y-6">
        {GROUPS.map((g) => (
          <div key={g.role}>
            <div className="flex items-center gap-2 mb-2.5">
              <g.icon className="w-4 h-4 text-[var(--text-primary)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">{g.title}</span>
              <a
                href={url(g.role, "square")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ml-1"
              >
                <ExternalLink className="w-3 h-3" /> ดูตัวอย่าง
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {FORMATS.map((f) => (
                <DownloadBtn key={f.fmt} role={g.role} {...f} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
