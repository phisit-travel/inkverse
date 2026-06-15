import { WifiOff, Download } from "lucide-react";

export const metadata = { title: "ออฟไลน์ — INKVERSE" };

// Shown by the service worker when a page isn't cached and there's no connection.
// Links are plain <a> (full navigation) so the SW serves cached pages offline —
// a Next <Link> would try to fetch RSC data and fail with no network.
export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 mb-5 flex items-center justify-center rounded-full bg-[var(--bg-surface)] border border-[var(--border)]">
        <WifiOff className="w-7 h-7 text-[var(--text-secondary)]" />
      </div>
      <h1 className="font-bebas text-4xl tracking-wider text-[var(--text-primary)]">ออฟไลน์อยู่</h1>
      <p className="text-sm text-[var(--text-secondary)] mt-3 max-w-sm leading-relaxed">
        ตอนที่ดาวน์โหลดเก็บไว้ยังอ่านได้ — ไปที่ <span className="text-[var(--text-primary)]">คลังออฟไลน์</span>{" "}
        หรือเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-7 w-full max-w-xs sm:max-w-none sm:w-auto">
        <a
          href="/downloads"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bal-btn text-sm font-semibold uppercase tracking-widest"
        >
          <Download className="w-4 h-4" />
          คลังออฟไลน์
        </a>
        <a
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-[var(--border)] text-[var(--text-primary)] text-sm font-semibold uppercase tracking-widest hover:border-white/30 transition-colors"
        >
          หน้าแรก
        </a>
      </div>
    </div>
  );
}
