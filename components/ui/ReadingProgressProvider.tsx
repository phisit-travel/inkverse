"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface ContinueItem {
  slug: string;
  title: string;
  coverUrl: string | null;
  chapterNum: number;
  percent: number;
}

interface ProgressData {
  items: ContinueItem[];
  bySlug: Record<string, number>;
  loaded: boolean;
}

const Ctx = createContext<ProgressData>({ items: [], bySlug: {}, loaded: false });

export function useReadingProgress() {
  return useContext(Ctx);
}

/**
 * Fetches the signed-in user's reading progress once and shares it with every
 * MangaCard (for the "อ่านแล้ว %" badge) and the ContinueReading row. Keeps the
 * host pages cacheable (ISR) — the per-user data hydrates on the client.
 */
export default function ReadingProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = useState<ProgressData>({ items: [], bySlug: {}, loaded: false });

  useEffect(() => {
    let alive = true;
    fetch("/api/continue-reading")
      .then((r) => (r.ok ? r.json() : { items: [], bySlug: {} }))
      .then((d) => {
        if (alive) setData({ items: d.items ?? [], bySlug: d.bySlug ?? {}, loaded: true });
      })
      .catch(() => {
        if (alive) setData({ items: [], bySlug: {}, loaded: true });
      });
    return () => {
      alive = false;
    };
  }, []);

  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}
