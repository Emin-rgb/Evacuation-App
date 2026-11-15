"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { az, type Dictionary } from "@/lib/i18n/az";
import { en } from "@/lib/i18n/en";

export type Lang = "az" | "en";

const DICTIONARIES: Record<Lang, Dictionary> = { az, en };
const STORAGE_KEY = "lang";

type Ctx = { lang: Lang; t: Dictionary; setLang: (l: Lang) => void };
const LanguageContext = createContext<Ctx>({ lang: "az", t: az, setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("az");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read after mount to keep SSR/hydration identical
      if (saved === "az" || saved === "en") setLangState(saved);
    } catch {
      /* storage unavailable: stay on AZ */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = DICTIONARIES[lang].app.name;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ lang, t: DICTIONARIES[lang], setLang }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useT(): Dictionary {
  return useContext(LanguageContext).t;
}

export function useLanguage() {
  const { lang, setLang } = useContext(LanguageContext);
  return { lang, setLang };
}
