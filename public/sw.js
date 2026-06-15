// KILL-SWITCH service worker.
//
// The previous caching SW broke image loading inside the app (covers/thumbnails
// went blank) in a way that couldn't be reproduced/diagnosed off-device, so this
// version intentionally does NOTHING: it has no fetch handler (so it never
// intercepts a request), clears all caches it created, and unregisters itself.
// Any app that still has the old SW updates to this one on next launch and
// self-destructs, restoring the plain WebView behaviour. The offline-download
// feature will be reintroduced behind on-device testing.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith("ink-")).map((k) => caches.delete(k)));
      } catch {}
      await self.clients.claim();
      try {
        await self.registration.unregister();
      } catch {}
    })()
  );
});
