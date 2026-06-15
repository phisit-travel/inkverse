"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Download, X, Share } from "lucide-react";
import Logo from "./Logo";
import { isAppContext } from "@/lib/offline";

// Mobile-only "get the app" strip. Android → download the APK. iOS → instructions
// to Add to Home Screen (a PWA — the legit way to get an app-like INKVERSE on
// iPhone, no App Store). Hidden once installed (isAppContext), on /download, and
// when dismissed. Also hidden inside the app via the `.download-cta` rule.
export default function AppInstallBanner() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (isAppContext()) return; // already installed
    if (localStorage.getItem("ink-app-banner") === "off") return;
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setShow(true);
  }, []);

  if (!show || pathname === "/download") return null;

  const dismiss = () => {
    localStorage.setItem("ink-app-banner", "off");
    setShow(false);
  };

  return (
    <div className="download-cta sm:hidden flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)]">
      {ios ? (
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Logo variant="icon" size="sm" href="" />
          <span className="flex flex-col min-w-0 leading-tight">
            <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
              ติดตั้ง INKVERSE บน iPhone
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 truncate">
              แตะ <Share className="w-3 h-3 shrink-0" /> แล้วเลือก “เพิ่มลงในหน้าจอโฮม”
            </span>
          </span>
        </div>
      ) : (
        <Link href="/download" className="flex items-center gap-2.5 flex-1 min-w-0">
          <Logo variant="icon" size="sm" href="" />
          <span className="flex flex-col min-w-0 leading-tight">
            <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
              โหลดแอป INKVERSE
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] truncate">
              อ่านลื่นเต็มจอ + ออฟไลน์ · ฟรี
            </span>
          </span>
          <span className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bal-btn text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap shrink-0">
            <Download className="w-3.5 h-3.5" />
            ติดตั้ง
          </span>
        </Link>
      )}
      <button
        onClick={dismiss}
        aria-label="ปิด"
        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
