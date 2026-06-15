// INKVERSE service worker — registered ONLY inside the Capacitor app, so the
// website is untouched. v3: never touches cross-origin requests (an earlier
// version intercepted cross-origin images and blanked the app's covers, which
// load directly from r2.dev via <Image unoptimized>). Strategy, same-origin only:
//   - /_next/static (hashed)  → cache-first (immutable)
//   - /api/img/<id> images    → DOWNLOADS cache first (explicit saves, never
//        auto-evicted) then a passive cache, keyed by id only (drops the rotating
//        ?e&u&s signature); rebuilds a clean 200 so re-reads/offline work.
//   - page navigations        → network-first, /offline fallback
//   - other /api/* (auth/data)→ never cached
const VERSION = "v3";
const STATIC_CACHE = `ink-static-${VERSION}`;
const IMAGE_CACHE = `ink-img-${VERSION}`;
const PAGE_CACHE = `ink-pages-${VERSION}`;
const DOWNLOADS_CACHE = "ink-downloads"; // version-independent: explicitly saved chapters
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((c) => c.addAll([OFFLINE_URL, "/downloads"]))
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("ink-") && k !== DOWNLOADS_CACHE && !k.endsWith(VERSION))
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
  // Leave ALL cross-origin requests (covers/avatars on r2.dev, Google, etc.) to
  // the browser — intercepting them is what blanked the app's covers.
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

async function imageCache(req, url) {
  const key = url.origin + url.pathname;
  const downloads = await caches.open(DOWNLOADS_CACHE);
  const saved = await downloads.match(key);
  if (saved) return saved;

  const cache = await caches.open(IMAGE_CACHE);
  const hit = await cache.match(key);
  if (hit) return hit;

  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const body = await res.blob();
      const clean = new Response(body, {
        status: 200,
        headers: { "Content-Type": res.headers.get("Content-Type") || "image/webp" },
      });
      cache.put(key, clean.clone());
      return clean;
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
