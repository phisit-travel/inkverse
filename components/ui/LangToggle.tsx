"use client";

import { useLang, useSetLang } from "./LangProvider";

/**
 * TH / EN language toggle — placed in the Navbar next to ThemeToggle.
 * Matches the monochrome design: text only, uppercase, hairline divider.
 */
export default function LangToggle() {
  const lang = useLang();
  const setLang = useSetLang();

  return (
    <button
      onClick={() => setLang(lang === "th" ? "en" : "th")}
      aria-label={lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
      title={lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
      className="flex items-center gap-0.5 h-9 px-2 rounded-lg text-[11px] font-semibold tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors select-none"
    >
      <span className={lang === "th" ? "text-[var(--text-primary)]" : "opacity-40"}>
        TH
      </span>
      <span className="mx-0.5 opacity-25">|</span>
      <span className={lang === "en" ? "text-[var(--text-primary)]" : "opacity-40"}>
        EN
      </span>
    </button>
  );
}
