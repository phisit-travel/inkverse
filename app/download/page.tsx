import { ShieldCheck, Smartphone, RefreshCw, Download, Gift, Share, WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { LATEST_APK } from "@/lib/appVersion";

const BASE_URL = process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://inksverse.com";

export const metadata: Metadata = {
  title: "ดาวน์โหลดแอป Android — อ่านแบบกันแคปหน้าจอ",
  description:
    "ดาวน์โหลดแอป INKVERSE สำหรับ Android — อ่านมังงะและนิยายแบบกันแคปหน้าจอ (FLAG_SECURE) ลื่นกว่าเว็บ อัปเดตอัตโนมัติ และโหลดตอนเก็บอ่านออฟไลน์ได้",
  alternates: { canonical: `${BASE_URL}/download` },
};

// Single source of truth (lib/appVersion) — same version the in-app updater checks.
// Versioned filename so a new build is never masked by a cached old .apk.
const APK_URL = process.env.NEXT_PUBLIC_ANDROID_APK_URL || LATEST_APK.url;
const APK_VERSION = process.env.NEXT_PUBLIC_ANDROID_APK_VERSION || LATEST_APK.version;

const FEATURES = [
  { icon: ShieldCheck, title: "กันแคปหน้าจอ", body: "บล็อกการแคป/อัดจอระดับระบบ (เหมือนแอปอ่านอีบุ๊กชั้นนำ) — ปกป้องผลงานนักเขียน" },
  { icon: Smartphone, title: "อ่านลื่นกว่าเว็บ", body: "เปิดเต็มจอ ไม่มีแถบเบราว์เซอร์กวน อ่านต่อเนื่องสบายตา" },
  { icon: RefreshCw, title: "อัปเดตอัตโนมัติ", body: "เนื้อหา/ฟีเจอร์ใหม่ขึ้นพร้อมเว็บทันที ไม่ต้องโหลดแอปใหม่บ่อยๆ" },
];

export default function DownloadPage() {
  const available = !!APK_URL;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <p className="eyebrow text-[var(--text-secondary)]">ANDROID APP</p>
        <h1 className="font-bebas text-5xl sm:text-6xl text-[var(--text-primary)] tracking-wider leading-[0.95]">
          INKVERSE สำหรับ Android
        </h1>
        <p className="text-[var(--text-secondary)] mt-4 max-w-xl mx-auto">
          อ่านมังงะ &amp; นิยาย แบบ <span className="text-[var(--text-primary)] font-semibold">กันแคปหน้าจอ</span> — ปลอดภัยกว่า ลื่นกว่า
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          {available ? (
            <a
              href={APK_URL}
              download
              className="inline-flex items-center gap-2 px-8 py-4 bal-btn text-sm font-semibold uppercase tracking-widest"
            >
              <Download className="w-5 h-5" /> Download Application
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 px-8 py-4 border border-[var(--border)] text-[var(--text-secondary)] text-sm font-semibold uppercase tracking-widest cursor-default">
              <Download className="w-5 h-5" /> เปิดให้โหลดเร็วๆ นี้
            </span>
          )}
          <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5">
            <Gift className="w-4 h-4" /> อ่านลื่น กันแคปหน้าจอ + โหลดเก็บอ่านออฟไลน์
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            สำหรับ Android เท่านั้น{APK_VERSION ? ` · เวอร์ชัน ${APK_VERSION}` : ""} · ไฟล์ฟรี ไม่มีโฆษณา
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <div className="w-11 h-11 flex items-center justify-center bg-[var(--text-primary)] text-[var(--bg-primary)] mb-3">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      {/* Install steps */}
      <h2 className="font-bebas text-2xl text-[var(--text-primary)] tracking-[0.18em] uppercase flex items-center gap-3 mb-5">
        <span className="w-6 h-px bg-[var(--text-primary)]" /> วิธีติดตั้ง
      </h2>
      <div className="space-y-3 mb-12">
        {[
          { n: "1", t: "กดปุ่ม Download Application", b: "บันทึกไฟล์ลงเครื่อง Android ของคุณ" },
          { n: "2", t: "อนุญาตติดตั้งจากแหล่งอื่น", b: "ครั้งแรก Android จะถาม — กด 'ตั้งค่า' แล้วเปิดอนุญาตให้เบราว์เซอร์/ตัวจัดการไฟล์" },
          { n: "3", t: "เปิดไฟล์ แล้วกดติดตั้ง", b: "เสร็จแล้วเปิดแอป INKVERSE อ่านได้เลย — แคปหน้าจอไม่ได้" },
        ].map((s) => (
          <div key={s.n} className="flex gap-4 border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            <span className="font-bebas text-3xl text-[var(--text-primary)] leading-none shrink-0 w-8">{s.n}</span>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{s.t}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{s.b}</p>
            </div>
          </div>
        ))}
      </div>

      {/* iOS — install as a home-screen PWA */}
      <h2 className="font-bebas text-2xl text-[var(--text-primary)] tracking-[0.18em] uppercase flex items-center gap-3 mb-5 mt-14">
        <span className="w-6 h-px bg-[var(--text-primary)]" /> สำหรับ iPhone / iPad
      </h2>
      <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
          iPhone ไม่ต้องโหลดไฟล์ — <span className="text-[var(--text-primary)] font-semibold">เพิ่ม INKVERSE ลงหน้าจอโฮม</span> แล้วใช้ได้เหมือนแอปจริง: เปิดเต็มจอ และ{" "}
          <span className="text-[var(--text-primary)] font-semibold inline-flex items-center gap-1">
            <WifiOff className="w-3.5 h-3.5" /> โหลดตอนเก็บไว้อ่านออฟไลน์ได้
          </span>
        </p>
        <div className="space-y-3">
          {[
            { n: "1", t: "เปิด inksverse.com ใน Safari", b: "ต้องเป็น Safari เท่านั้น (ไม่ใช่ Chrome/แอปอื่น)" },
            { n: "2", t: "แตะปุ่มแชร์ ด้านล่าง", b: "ไอคอนกล่องลูกศรชี้ขึ้น กลางแถบล่างของ Safari", share: true },
            { n: "3", t: "เลือก “เพิ่มลงในหน้าจอโฮม”", b: "เลื่อนหาในเมนู → กด เพิ่ม → ไอคอน IV จะโผล่บนจอ เปิดได้เลย" },
          ].map((s) => (
            <div key={s.n} className="flex gap-4 border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <span className="font-bebas text-3xl text-[var(--text-primary)] leading-none shrink-0 w-8">{s.n}</span>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  {s.t}
                  {s.share && <Share className="w-4 h-4" />}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{s.b}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
