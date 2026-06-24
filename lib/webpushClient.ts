// Client-side Web Push helpers, shared by the bookmark button + the standalone
// bell. Subscribing means: register the push-only SW, get permission, create a
// PushManager subscription, and save it server-side (/api/push/subscribe).

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlB64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** True if this environment can do Web Push (has a key, not the in-app WebView). */
export function pushSupported(): boolean {
  if (!VAPID || typeof window === "undefined") return false;
  if ((window as unknown as { Capacitor?: unknown }).Capacitor) return false; // app uses FCM
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export type PushStatus = "on" | "denied" | "unsupported" | "error";

/** Ensure this browser is subscribed for the current user. Idempotent.
 *
 *  CRITICAL ordering for iOS: requestPermission()/subscribe() must run inside
 *  the user gesture, BEFORE any unrelated await (a network fetch consumes the
 *  transient activation → iOS silently refuses). So callers must invoke this at
 *  the very top of the click handler, and we touch permission/subscribe first —
 *  no fetch beforehand. We ALSO re-save every time (idempotent upsert) to heal a
 *  server row that was pruned after a failed send while the browser still holds
 *  the subscription. */
export async function ensureWebPushSubscribed(): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  // Permission first, still inside the gesture.
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "error";
  try {
    const reg = await navigator.serviceWorker.register("/push-sw.js");
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID!) as BufferSource,
      });
    }
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    return res.ok ? "on" : "error";
  } catch {
    return "error";
  }
}

/** True if this browser already has an active push subscription. */
export async function isWebPushSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const sub = await navigator.serviceWorker
      .getRegistration("/push-sw.js")
      .then((r) => r?.pushManager.getSubscription());
    return !!sub;
  } catch {
    return false;
  }
}
