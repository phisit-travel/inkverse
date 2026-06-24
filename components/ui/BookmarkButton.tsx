"use client";

import { useEffect, useState } from "react";
import { Bookmark, BellRing } from "lucide-react";
import clsx from "clsx";
import { ensureWebPushSubscribed, isWebPushSubscribed, pushSupported } from "@/lib/webpushClient";

interface BookmarkButtonProps {
  mangaId: string;
  initialBookmarked: boolean;
}

// One action = follow this series + get notified of new chapters. Bookmarking is
// what notifyNewChapter targets, so bookmarking also turns on Web Push
// (best-effort: a denied/unsupported browser still bookmarks fine). The toggle
// flips OPTIMISTICALLY so it feels instant. iOS requires requestPermission/
// subscribe to run inside the click gesture, so we kick that off before the
// bookmark fetch (see ensureWebPushSubscribed).
export default function BookmarkButton({ mangaId, initialBookmarked }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pushOn, setPushOn] = useState(false);
  const [canPush, setCanPush] = useState(false);
  const [hint, setHint] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const ok = pushSupported() && Notification.permission !== "denied";
    setCanPush(ok);
    if (initialBookmarked) isWebPushSubscribed().then(setPushOn).catch(() => {});
  }, [initialBookmarked]);

  function applyPushResult(status: "on" | "denied" | "unsupported" | "error" | null) {
    if (status === "on") setPushOn(true);
    else if (status === "denied") {
      setCanPush(false);
      setHint("เปิดการแจ้งเตือนในตั้งค่าเบราว์เซอร์เพื่อรับตอนใหม่");
    }
  }

  const toggle = async () => {
    if (pending) return;

    // Heal case: already bookmarked but push isn't on (subscription expired/lost)
    // → tapping RE-ENABLES push instead of un-bookmarking, giving a one-tap path
    // back to notifications. ensureWebPushSubscribed runs first → in-gesture (iOS).
    if (bookmarked && !pushOn && canPush) {
      setHint("");
      setPending(true);
      const status = await ensureWebPushSubscribed();
      setPending(false);
      applyPushResult(status);
      return;
    }

    const next = !bookmarked;
    setBookmarked(next); // optimistic — instant feedback
    setHint("");
    setPending(true);

    // Kick push-enable FIRST, synchronously inside this click, so iOS sees the
    // user gesture (the bookmark fetch below would otherwise consume the
    // activation). Runs concurrently; we read its result afterwards.
    const pushPromise: Promise<"on" | "denied" | "unsupported" | "error" | null> =
      next && canPush ? ensureWebPushSubscribed() : Promise.resolve(null);

    try {
      const res = await fetch("/api/bookmark", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mangaId }),
      });
      if (!res.ok) {
        setBookmarked(!next); // revert
        return;
      }
    } catch {
      setBookmarked(!next); // revert on network error
      return;
    } finally {
      setPending(false);
    }

    applyPushResult(await pushPromise);
  };

  // Bell shown when push is on, or as a call-to-action to (re)enable it.
  const showBell = bookmarked && (pushOn || (!pushOn && canPush));
  const label = !bookmarked
    ? "บุ๊กมาร์ก + รับแจ้งเตือน"
    : pushOn
      ? "ติดตามอยู่ · แจ้งเตือนเปิด"
      : canPush
        ? "แตะเพื่อเปิดแจ้งเตือน"
        : "บุ๊กมาร์กแล้ว";

  return (
    <div className="w-full">
      <button
        onClick={toggle}
        className={clsx(
          "w-full py-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all",
          bookmarked
            ? "bg-[var(--text-primary)]/20 border-[var(--text-primary)]/40 text-[var(--text-primary)]"
            : "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] hover:border-white/30"
        )}
      >
        {showBell ? (
          <BellRing className={clsx("w-4 h-4", pushOn && "fill-[var(--text-primary)]")} />
        ) : (
          <Bookmark className={clsx("w-4 h-4", bookmarked && "fill-[var(--text-primary)]")} />
        )}
        {label}
      </button>
      {hint && (
        <p className="text-[11px] text-[var(--text-muted)] text-center mt-1.5 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}
