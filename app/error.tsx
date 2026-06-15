"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, WifiOff, Download } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    console.error(error);
    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
  }, [error]);

  // Offline, most errors are just a client navigation failing to fetch from the
  // server (common in the iOS PWA). Send the user to their downloads instead of a
  // scary error — plain <a> so the service worker serves the cached pages.
  if (offline) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center mb-4">
          <WifiOff className="w-7 h-7 text-[var(--text-secondary)]" />
        </div>
        <h1 className="font-bebas text-4xl tracking-wider text-[var(--text-primary)]">ออฟไลน์อยู่</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-sm leading-relaxed">
          เปิดอ่านตอนที่ดาวน์โหลดเก็บไว้ได้ที่คลังออฟไลน์ หรือเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-7">
          <a
            href="/offline"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bal-btn text-sm font-semibold uppercase tracking-widest"
          >
            <Download className="w-4 h-4" /> คลังออฟไลน์
          </a>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--border)] text-[var(--text-primary)] text-sm font-semibold uppercase tracking-widest hover:border-white/30 transition-colors"
          >
            <Home className="w-4 h-4" /> หน้าแรก
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-[var(--text-primary)]/10 border border-[var(--text-primary)]/30 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-[var(--text-primary)]" />
      </div>
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">เกิดข้อผิดพลาด</h1>
      <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md">
        ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง หากยังเป็นอยู่กรุณาติดต่อผู้ดูแลระบบ
      </p>
      {error.digest && (
        <p className="text-xs text-[var(--text-muted)] mt-2 font-mono">รหัสอ้างอิง: {error.digest}</p>
      )}
      <div className="flex flex-wrap justify-center gap-3 mt-7">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bal-btn text-sm font-semibold hover:opacity-90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> ลองใหม่
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-semibold hover:border-white/30 transition-colors"
        >
          <Home className="w-4 h-4" /> หน้าแรก
        </Link>
      </div>
    </div>
  );
}
