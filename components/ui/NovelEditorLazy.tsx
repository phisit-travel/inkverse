"use client";

import dynamic from "next/dynamic";

interface Existing {
  id: string;
  chapterNum: number;
  title: string | null;
  content: string | null;
  isPremium: boolean;
  coinCost: number;
  status: string;
  publishAt: string | null;
  authorNote: string | null;
  freeAt: string | null;
}

interface NovelEditorProps {
  mangaSlug: string;
  suggestedNum: number;
  existing?: Existing | null;
}

const NovelEditor = dynamic(() => import("@/components/ui/NovelEditor"), {
  ssr: false,
  loading: () => (
    <div className="mt-6 space-y-4 animate-pulse">
      <div className="h-10 bg-[var(--bg-card)] border border-[var(--border)]" />
      <div className="h-64 bg-[var(--bg-card)] border border-[var(--border)]" />
      <div className="h-10 bg-[var(--bg-card)] border border-[var(--border)] w-1/3" />
    </div>
  ),
});

export default function NovelEditorLazy(props: NovelEditorProps) {
  return <NovelEditor {...props} />;
}
