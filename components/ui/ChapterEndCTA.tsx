"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, UserPlus, X, Loader2, Check } from "lucide-react";
import { pushSupported, ensureWebPushSubscribed } from "@/lib/webpushClient";

const DISMISS_KEY = "ivEndCtaDismissed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000; // re-ask at most once a week

/**
 * End-of-chapter capture card — the highest-intent moment to turn a (largely
 * anonymous, scanlation-drawn) reader into OWNED audience: a free signup, or
 * Web Push opt-in for logged-in readers. Tasteful + dismissible (remembers for a
 * week) so it never nags. This is the "bridge" play: harvest the borrowed
 * traffic into a channel we keep even after the free seed content goes away.
 */
export default function ChapterEndCTA({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<"signup" | "push">("signup");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (t && Date.now() - t < DISMISS_MS) return;
    } catch {}

    if (!loggedIn) {
      setMode("signup");
      setShow(true);
      return;
    }
    // Logged in → only nudge push when it can actually work and isn't already on.
    if (!pushSupported() || Notification.permission === "denied") return;
    navigator.serviceWorker
      .getRegistration("/push-sw.js")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => {
        if (!sub) {
          setMode("push");
          setShow(true);
        }
      })
      .catch(() => {});
  }, [loggedIn]);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  // iOS: requestPermission/subscribe must be the first thing in the gesture
  // (ensureWebPushSubscribed touches permission before any await).
  const enablePush = async () => {
    setBusy(true);
    const r = await ensureWebPushSubscribed();
    setBusy(false);
    if (r === "on") {
      setDone(true);
      setTimeout(dismiss, 1800);
    }
  };

  if (!show) return null;

  return (
    <div className="relative my-8 border border-[var(--text-primary)] bg-[var(--bg-surface)] px-5 py-5 sm:px-6">
      <button
        onClick={dismiss}
        aria-label="ปิด"
        className="absolute top-2.5 right-2.5 p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-4 pr-6">
        {mode === "signup" ? (
          <UserPlus className="w-7 h-7 shrink-0 text-[var(--text-primary)]" />
        ) : (
          <Bell className="w-7 h-7 shrink-0 text-[var(--text-primary)]" />
        )}
        <div className="min-w-0 flex-1">
          {mode === "signup" ? (
            <>
              <p className="font-bebas text-2xl tracking-wider leading-none text-[var(--text-primary)]">
                อ่านจบแล้ว? อย่าพลาดตอนใหม่
              </p>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                สมัครฟรี — บุ๊กมาร์กเรื่องที่ชอบ &amp; รับแจ้งเตือนตอนใหม่ก่อนใคร
              </p>
              <Link
                href={`/auth/signin?callbackUrl=${encodeURIComponent(pathname || "/")}`}
                className="mt-3 inline-flex items-center gap-2 border border-[var(--text-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-colors"
              >
                สมัครฟรี
              </Link>
            </>
          ) : (
            <>
              <p className="font-bebas text-2xl tracking-wider leading-none text-[var(--text-primary)]">
                รับแจ้งเตือนตอนใหม่ก่อนใคร
              </p>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                เปิดครั้งเดียว เด้งเตือนทุกครั้งที่เรื่องที่คุณติดตามมีตอนใหม่
              </p>
              <button
                onClick={enablePush}
                disabled={busy || done}
                className="mt-3 inline-flex items-center gap-2 border border-[var(--text-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-colors disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> กำลังเปิด…
                  </>
                ) : done ? (
                  <>
                    <Check className="w-4 h-4" /> เปิดแล้ว
                  </>
                ) : (
                  "เปิดแจ้งเตือน"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
