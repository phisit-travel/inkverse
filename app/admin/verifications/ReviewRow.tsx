"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, BadgeCheck } from "lucide-react";

interface Req {
  id: string;
  username: string;
  penName: string | null;
  status: string;
  coinsPaid: number;
  createdAt: string;
}

export default function ReviewRow({ req }: { req: Req }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const pending = req.status === "PENDING";

  async function decide(action: "approve" | "reject") {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/verifications/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={`border border-[var(--border)] p-4 flex items-center justify-between gap-4 ${pending ? "bg-[var(--bg-surface)]" : "bg-[var(--bg-card)] opacity-70"}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-[var(--text-primary)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{req.penName || req.username}</span>
          <span className="text-xs text-[var(--text-secondary)]">@{req.username}</span>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-1.5">
          จ่าย {req.coinsPaid} เหรียญ · {new Date(req.createdAt).toLocaleString("th-TH")} · {req.status}
        </p>
      </div>
      {pending && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => decide("approve")}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 bal-btn px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest disabled:opacity-50"
          >
            {loading === "approve" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            อนุมัติ
          </button>
          <button
            onClick={() => decide("reject")}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-colors disabled:opacity-50"
          >
            {loading === "reject" ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            ปฏิเสธ (คืนเหรียญ)
          </button>
        </div>
      )}
    </div>
  );
}
