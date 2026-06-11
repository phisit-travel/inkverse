"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Fires a page-view ping on each route change (server skips admin + bots get no JS). */
export default function TrafficBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    fetch("/api/track", { method: "POST", keepalive: true }).catch(() => {});
  }, [pathname]);
  return null;
}
