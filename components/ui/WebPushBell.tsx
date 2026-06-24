"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

type State = "loading" | "unsupported" | "anon" | "off" | "on" | "denied";

// VAPID public key → the Uint8Array the PushManager wants.
function urlB64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * Enable/disable browser (Web Push) notifications for new chapters. Once on, the
 * user gets pushed for every series they bookmark + creator they follow (see
 * notifyNewChapter). Hidden where it can't work: no VAPID key, unsupported
 * browser, or inside the Capacitor app (that uses native FCM instead).
 */
export default function WebPushBell({ loggedIn }: { loggedIn: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // In-app (Capacitor) uses native FCM push, not Web Push → don't show here.
    const inApp = !!(window as unknown as { Capacitor?: unknown }).Capacitor;
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!VAPID || inApp || !supported) {
      setState("unsupported");
      return;
    }
    if (!loggedIn) {
      setState("anon");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    // Already subscribed on this browser?
    navigator.serviceWorker
      .getRegistration("/push-sw.js")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, [loggedIn]);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID!) as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  const base =
    "w-full py-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all";

  if (state === "anon") {
    return (
      <Link
        href="/auth/signin"
        className={clsx(base, "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] hover:border-white/30")}
      >
        <Bell className="w-4 h-4" /> เข้าสู่ระบบเพื่อรับแจ้งเตือนตอนใหม่
      </Link>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
        การแจ้งเตือนถูกบล็อกในเบราว์เซอร์ — เปิดได้ที่ตั้งค่าเว็บไซต์ของเบราว์เซอร์
      </p>
    );
  }

  const on = state === "on";
  return (
    <button
      onClick={on ? disable : enable}
      disabled={busy}
      className={clsx(
        base,
        on
          ? "bg-[var(--text-primary)]/20 border-[var(--text-primary)]/40 text-[var(--text-primary)]"
          : "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] hover:border-white/30"
      )}
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : on ? (
        <BellRing className="w-4 h-4 fill-[var(--text-primary)]" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
      {on ? "แจ้งเตือนตอนใหม่: เปิด" : "รับแจ้งเตือนตอนใหม่"}
    </button>
  );
}
