"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en, { type TranslationKey } from "./en";
import hi from "./hi";
import mr from "./mr";
import ta from "./ta";
import te from "./te";

export type Locale = "en" | "hi" | "mr" | "ta" | "te";

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, hi, mr, ta, te };
const STORAGE_KEY = "paaniplan-locale";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "hi" || stored === "mr" || stored === "ta" || stored === "te") {
        setLocaleState(stored as Locale);
      }
    } catch {}
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey) => dictionaries[locale][key] ?? dictionaries.en[key],
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
