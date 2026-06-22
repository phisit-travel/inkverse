"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

export default function DeliverButton({ token }: { token: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const field =
    "w-full bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/50 transition-colors";

  async function deliver() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/services/order/${token}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryUrl: deliveryUrl.trim() || undefined,
          deliveryNote: deliveryNote.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { message?: string }).message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
        return;
      }
      setDone(true);
      setTimeout(() => router.refresh(), 500);
    } catch {
      setError("เครือข่ายขัดข้อง กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <span className="text-xs text-[var(--text-muted)]">ส่งมอบแล้ว</span>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-xs border border-[var(--border)] px-3 py-1.5 text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider"
      >
        <Send className="w-3 h-3" />
        ส่งมอบงาน
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-3 min-w-[280px]">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
              ลิงก์ไฟล์ (ถ้ามี)
            </label>
            <input
              className={field}
              value={deliveryUrl}
              onChange={(e) => setDeliveryUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
              หมายเหตุถึงลูกค้า (ถ้ามี)
            </label>
            <textarea
              className={`${field} min-h-[70px] resize-y`}
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-primary)] border border-[var(--border)] px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={deliver}
            disabled={loading}
            className="w-full bal-btn py-2 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            ยืนยันส่งมอบ
          </button>
        </div>
      )}
    </div>
  );
}
