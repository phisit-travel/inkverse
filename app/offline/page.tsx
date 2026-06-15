import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = { title: "ออฟไลน์ — INKVERSE" };

// Shown by the service worker when a page isn't cached and there's no connection.
export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 mb-5 flex items-center justify-center rounded-full bg-[var(--bg-surface)] border border-[var(--border)]">
        <WifiOff className="w-7 h-7 text-[var(--text-secondary)]" />
      </div>
      <h1 className="font-bebas text-4xl tracking-wider text-[var(--text-primary)]">
        ออฟไลน์อยู่
      </h1>
      <p className="text-sm text-[var(--text-secondary)] mt-3 max-w-sm leading-relaxed">
        ตอนที่คุณเปิดอ่านไปแล้วยังอ่านต่อได้แบบออฟไลน์ — ลองกลับไปที่ตอนที่โหลดไว้
        หรือเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง
      </p>
      <Link
        href="/"
        className="mt-7 px-6 py-3 bal-btn text-sm font-semibold uppercase tracking-widest"
      >
        หน้าแรก
      </Link>
    </div>
  );
}
