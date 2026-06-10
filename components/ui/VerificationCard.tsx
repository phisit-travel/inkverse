"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2, ShieldQuestion, Clock } from "lucide-react";

export default function VerificationCard({
  status,
  fee,
}: {
  status: "NONE" | "PENDING" | "REJECTED";
  fee: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/translator/verify", { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(
          d.error === "INSUFFICIENT_COINS"
            ? `เหรียญไม่พอ (ต้องมี ${fee})`
            : d.error === "ALREADY_VERIFIED"
            ? "ยืนยันแล้ว"
            : d.error === "PENDING_EXISTS"
            ? "มีคำขอที่รอตรวจสอบอยู่แล้ว"
            : "ส่งคำขอไม่สำเร็จ"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  if (status === "PENDING") {
    return (
      <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 flex items-center gap-3">
        <Clock className="w-5 h-5 text-[var(--text-primary)] shrink-0" />
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">รอแอดมินตรวจสอบ</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            คำขอยืนยันตัวตนของคุณกำลังรอการอนุมัติ
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <ShieldQuestion className="w-5 h-5 text-[var(--text-primary)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide flex items-center gap-1.5">
            ยืนยันตัวตน <BadgeCheck className="w-4 h-4" />
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 max-w-md leading-relaxed">
            รับเครื่องหมายยืนยันบนโปรไฟล์และผลงาน เพิ่มความน่าเชื่อถือ · ค่าธรรมเนียม {fee} เหรียญ
            {status === "REJECTED" ? " (คำขอก่อนหน้าไม่ผ่าน — ส่งใหม่ได้)" : ""}
          </p>
          {error && <p className="text-xs text-[var(--text-primary)] mt-1.5">{error}</p>}
        </div>
      </div>
      <button
        onClick={submit}
        disabled={loading}
        className="bal-btn shrink-0 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}
        ขอยืนยัน ({fee})
      </button>
    </div>
  );
}
