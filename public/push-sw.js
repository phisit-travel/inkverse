// INKVERSE web-push service worker — push notifications ONLY.
//
// Deliberately has NO `fetch` handler: it never intercepts requests or caches
// anything, so registering it on the website doesn't change any caching/offline
// behaviour (the site otherwise runs without a service worker — sw.js is the
// app-only one). It just wakes on a push and shows the notification.
// Registered by components/ui/WebPushBell.tsx.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "INKVERSE";
  const options = {
    body: data.body || "",
    icon: "/icon",
    badge: "/icon",
    lang: "th",
    data: { link: data.link || "/" },
    // Collapse repeat notifications for the same link (e.g. a re-send).
    tag: data.link || undefined,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Focus an already-open tab (navigating it) instead of opening a new one.
        for (const c of clients) {
          if ("focus" in c) {
            if ("navigate" in c) c.navigate(link).catch(() => {});
            return c.focus();
          }
        }
        return self.clients.openWindow(link);
      })
  );
});
