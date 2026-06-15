"use client";

import { useEffect } from "react";

// Registers the service worker ONLY inside the Capacitor app. Keeping it app-only
// means offline reading + instant cached loads are a real reason to install the
// app, and a SW bug (if any) can never affect the website — only app users, who
// also auto-update. To kill it in an emergency, ship a /sw.js that unregisters.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    const inApp = !!(window as unknown as { Capacitor?: unknown }).Capacitor;
    if (!inApp || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
