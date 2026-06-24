"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";

// Fires a test push to the admin's own devices via /api/admin/test-push.
// Surfaces the targeted device count so "nothing popped" is easy to diagnose
// (web:0 = you haven't tapped "รับแจ้งเตือนตอนใหม่" on this browser yet).
export default function TestPushButton() {
  const [label, setLabel] = useState("ส่ง push ทดสอบหาตัวเอง");
  const [busy, setBusy] = useState(false);

  const click = async () => {
    setBusy(true);
    setLabel("กำลังส่ง...");
    try {
      const res = await fetch("/api/admin/test-push", { method: "POST" });
      const d = (await res.json().catch(() => ({}))) as { web?: number; fcm?: number };
      if (res.ok) {
        const web = d.web ?? 0;
        const fcm = d.fcm ?? 0;
        setLabel(
          web + fcm === 0
            ? "ยังไม่มีอุปกรณ์ — กดเปิดแจ้งเตือนก่อน"
            : `ส่งแล้ว ✓ (เว็บ ${web} · แอป ${fcm})`
        );
      } else {
        setLabel("ส่งไม่สำเร็จ");
      }
    } catch {
      setLabel("เครือข่ายขัดข้อง");
    } finally {
      setBusy(false);
      setTimeout(() => setLabel("ส่ง push ทดสอบหาตัวเอง"), 5000);
    }
  };

  return (
    <button
      onClick={click}
      disabled={busy}
      className="py-3 px-5 rounded-xl bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-surface)] text-[var(--text-primary)] text-sm font-medium text-center hover:opacity-90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
    >
      <BellRing className="w-4 h-4" /> {label}
    </button>
  );
}
