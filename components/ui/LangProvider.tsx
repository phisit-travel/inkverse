"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Lang } from "@/lib/i18n";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<LangCtx>({
  lang: "th",
  setLang: () => {},
});

/**
 * Provides the active UI language throughout the tree.
 * Defaults to Thai (matching SSR) and reads localStorage after hydration —
 * same pattern as ThemeToggle. No hydration mismatch because the initial
 * state is always "th" on both server and client.
 */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("lang") as Lang | null;
      if (stored === "en" || stored === "th") setLangState(stored);
    } catch {
      // localStorage unavailable (private browsing / SSR guard)
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch {}
  }

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

/** Returns the current UI language. Use inside any "use client" component. */
export function useLang(): Lang {
  return useContext(LangContext).lang;
}

/** Returns the language setter. Use inside LangToggle and similar controls. */
export function useSetLang(): (l: Lang) => void {
  return useContext(LangContext).setLang;
}
