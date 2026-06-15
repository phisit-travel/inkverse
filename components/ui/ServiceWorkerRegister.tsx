"use client";

import { useEffect } from "react";

// TEMPORARILY DISABLED. The caching service worker broke cover images inside the
// app, so instead of registering it we actively unregister any copy still
// installed and clear its caches. This is the most reliable client-side kill —
// it doesn't depend on the browser noticing the kill-switch /sw.js update. The
// offline-download feature will return once the SW can be tested on-device.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistrations?.()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => keys.forEach((k) => k.startsWith("ink-") && caches.delete(k)))
        .catch(() => {});
    }
  }, []);

  return null;
}
