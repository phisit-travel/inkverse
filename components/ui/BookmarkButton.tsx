"use client";

import { useEffect, useState } from "react";
import { Bookmark, BellRing } from "lucide-react";
import clsx from "clsx";
import { ensureWebPushSubscribed, isWebPushSubscribed, pushSupported } from "@/lib/webpushClient";

interface BookmarkButtonProps {
  mangaId: string;
  initialBookmarked: boolean;
}

// One action = follow this series + get notified of new chapters. Bookmarking
// is what notifyNewChapter targets, so the first bookmark also turns on Web
// Push (best-effort: a denied/unsupported browser still bookmarks fine). The
// toggle flips OPTIMISTICALLY so it feels instant, then reconciles with the
// server and reverts on failure.
export default function BookmarkButton({ mangaId, initialBookmarked }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pushOn, setPushOn] = useState(false);
  const [hint, setHint] = useState("");
  const [pending, setPending] = useState(false);

  // Reflect existing push state so a returning subscriber sees the bell.
  useEffect(() => {
    if (initialBookmarked) isWebPushSubscribed().then(setPushOn).catch(() => {});
  }, [initialBookmarked]);

  const toggle = async () => {
    if (pending) return;
    const next = !bookmarked;
    setBookmarked(next); // optimistic — instant feedback
    setHint("");
    setPending(true);
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
      // Bookmarking on → make sure notifications actually arrive (one prompt,
      // only the first time; later bookmarks find an existing subscription).
      if (next && pushSupported()) {
        const status = await ensureWebPushSubscribed();
        if (status === "on") setPushOn(true);
        else if (status === "denied")
          setHint("เปิดการแจ้งเตือนในตั้งค่าเบราว์เซอร์เพื่อรับตอนใหม่");
      }
    } catch {
      setBookmarked(!next); // revert on network error
    } finally {
      setPending(false);
    }
  };

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
        {bookmarked && pushOn ? (
          <BellRing className="w-4 h-4 fill-[var(--text-primary)]" />
        ) : (
          <Bookmark className={clsx("w-4 h-4", bookmarked && "fill-[var(--text-primary)]")} />
        )}
        {bookmarked
          ? pushOn
            ? "ติดตามอยู่ · แจ้งเตือนเปิด"
            : "บุ๊กมาร์กแล้ว"
          : "บุ๊กมาร์ก + รับแจ้งเตือน"}
      </button>
      {hint && (
        <p className="text-[11px] text-[var(--text-muted)] text-center mt-1.5 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}
