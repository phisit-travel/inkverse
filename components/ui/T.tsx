"use client";

/**
 * Inline translation leaf — renders a single translated string.
 *
 * Designed to be dropped into Server Component JSX as a client leaf:
 *   <h2><T k="latestUpdates" /></h2>
 *
 * SSR always renders Thai (the default lang), then re-renders on the client
 * if the user has "en" stored in localStorage — no hydration mismatch because
 * the initial state is always "th" on both sides (same pattern as ThemeToggle).
 */

import { useLang } from "./LangProvider";
import { dict, type LangKey } from "@/lib/i18n";

export default function T({ k }: { k: LangKey }) {
  const lang = useLang();
  return <>{dict[lang][k]}</>;
}
