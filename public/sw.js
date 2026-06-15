// INKVERSE service worker — registered ONLY inside the Capacitor app (see
// ServiceWorkerRegister), so offline reading + instant cached loads are an
// app-exclusive advantage and the web stays completely untouched.
//
// Strategy is deliberately safe (no stale-content risk):
//   - hashed build assets (/_next/static)  → cache-first (immutable)
//   - manga page images (/api/img/<id>)    → cache-first, keyed by id only
//        (drops the rotating ?e&u&s signature) → re-reads are instant + work
//        offline; access is still gated on the network by the signed request
//        that first populated the cache.
//   - page navigations                     → network-first (always fresh),
//        cache only as an offline fallback.
//   - every other /api/* (auth/data)       → never cached, always network.
const VERSION = "v1";
const STATIC_CACHE = `ink-static-${VERSION}`;
const IMAGE_CACHE = `ink-img-${VERSION}`;
const PAGE_CACHE = `ink-pages-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(PAGE_CACHE).then((c) => c.add(OFFLINE_URL)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("ink-") && !k.endsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  // Leave cross-origin (R2 image bytes, Google, etc.) to the browser default.
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }
  if (url.pathname.startsWith("/api/img/")) {
    event.respondWith(imageCache(req, url));
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    return; // auth/data — always fresh from network
  }
  if (req.mode === "navigate") {
    event.respondWith(pageNetworkFirst(req));
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return hit || Response.error();
  }
}

// Cache page images by id only (ignore the rotating signature) so the same page
// hits cache across sessions / offline. Rebuild a clean 200 to avoid caching a
// redirected response (the request follows /api/img's 302 → R2).
async function imageCache(req, url) {
  const cache = await caches.open(IMAGE_CACHE);
  const key = url.origin + url.pathname;
  const hit = await cache.match(key);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const body = await res.clone().blob();
      const clean = new Response(body, {
        status: 200,
        headers: { "Content-Type": res.headers.get("Content-Type") || "image/webp" },
      });
      cache.put(key, clean);
    }
    return res;
  } catch {
    return Response.error();
  }
}

async function pageNetworkFirst(req) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req);
    if (hit) return hit;
    const offline = await caches.match(OFFLINE_URL);
    return offline || Response.error();
  }
}
