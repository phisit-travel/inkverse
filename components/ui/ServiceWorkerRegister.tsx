"use client";

import { useEffect } from "react";

// Registers the service worker ONLY inside the Capacitor app, so offline reading
// + instant cached loads are an app-exclusive advantage and the website is never
// affected. The SW (v3) only touches same-origin requests — it must NOT intercept
// cross-origin images (that blanked the app's r2.dev covers). Emergency kill:
// ship a /sw.js that unregisters + this component to unregister from the page.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    const inApp = !!(window as unknown as { Capacitor?: unknown }).Capacitor;
    if (!inApp || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
