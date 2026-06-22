"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

// Admin-only: remove an unpaid order (test / abandoned / spam). The API refuses
// to delete an order that has received money, so financial records are safe.
export default function DeleteOrderButton({ token }: { token: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function del() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/services/order/${token}/delete`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((d as { message?: string }).message ?? "ลบไม่สำเร็จ");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("เครือข่ายขัดข้อง");
      setLoading(false);
    }
  }

  if (error) return <span className="text-[11px] text-[var(--text-muted)]">{error}</span>;

  if (!confirm)
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <Trash2 className="w-3 h-3" /> ลบ
      </button>
    );

  return (
    <span className="inline-flex items-center gap-2 text-[11px]">
      <button
        type="button"
        onClick={del}
        disabled={loading}
        className="inline-flex items-center gap-1 text-[var(--text-primary)] underline disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null} ยืนยันลบ
      </button>
      <button type="button" onClick={() => setConfirm(false)} className="text-[var(--text-muted)]">
        ยกเลิก
      </button>
    </span>
  );
}
