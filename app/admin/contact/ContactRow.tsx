"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw } from "lucide-react";

interface Msg {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  createdAt: string;
  username: string | null;
}

export default function ContactRow({ msg }: { msg: Msg }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const resolved = msg.status === "RESOLVED";

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/contact/${msg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: resolved ? "OPEN" : "RESOLVED" }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`border border-[var(--border)] p-4 ${resolved ? "bg-[var(--bg-card)] opacity-70" : "bg-[var(--bg-surface)]"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{msg.name}</span>
            {msg.username && <span className="text-xs text-[var(--text-secondary)]">@{msg.username}</span>}
            <span className="text-xs text-[var(--text-secondary)]">· {msg.email}</span>
          </div>
          {msg.subject && (
            <p className="text-sm text-[var(--text-primary)] mt-1.5 font-medium">{msg.subject}</p>
          )}
          <p className="text-sm text-[var(--text-secondary)] mt-1 whitespace-pre-wrap break-words">{msg.message}</p>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-2">
            {new Date(msg.createdAt).toLocaleString("th-TH")}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={loading}
          className="shrink-0 inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : resolved ? (
            <RotateCcw className="w-3 h-3" />
          ) : (
            <Check className="w-3 h-3" />
          )}
          {resolved ? "เปิดใหม่" : "เสร็จสิ้น"}
        </button>
      </div>
    </div>
  );
}
