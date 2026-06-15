"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Download, X } from "lucide-react";
import Logo from "./Logo";

// Mobile-only "get the Android app" strip. The top-bar download button is hidden
// on phones (it crowds the bar), so without this people never find the app.
// Dismissible (remembered), hidden on the /download page itself, and auto-hidden
// inside the app via the `.download-cta` rule (html.native-app).
export default function AppInstallBanner() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const inApp = !!(window as unknown as { Capacitor?: unknown }).Capacitor;
    if (inApp) return;
    if (localStorage.getItem("ink-app-banner") === "off") return;
    setShow(true);
  }, []);

  if (!show || pathname === "/download") return null;

  const dismiss = () => {
    localStorage.setItem("ink-app-banner", "off");
    setShow(false);
  };

  return (
    <div className="download-cta sm:hidden flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)]">
      <Link href="/download" className="flex items-center gap-2.5 flex-1 min-w-0">
        <Logo variant="icon" size="sm" href="" />
        <span className="flex flex-col min-w-0 leading-tight">
          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
            โหลดแอป INKVERSE
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] truncate">
            อ่านลื่นเต็มจอบน Android · ฟรี
          </span>
        </span>
        <span className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bal-btn text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap shrink-0">
          <Download className="w-3.5 h-3.5" />
          ติดตั้ง
        </span>
      </Link>
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
