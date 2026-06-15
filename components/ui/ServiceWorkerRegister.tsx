"use client";

import { useEffect } from "react";
import { isAppContext } from "@/lib/offline";

// Registers the offline service worker in any "installed app" context — the
// Capacitor Android app, an iOS Add-to-Home-Screen PWA, or an installed PWA — so
// the website (plain browser tab) is never affected. Also flags <html> with
// `app-mode` so app-only UI (offline library link) shows and "download the app"
// CTAs hide. The SW (v3) only touches same-origin requests; it must NOT intercept
// cross-origin images (that blanked the app's r2.dev covers).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!isAppContext()) return;
    document.documentElement.classList.add("app-mode");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
