"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/types";
import { dictionaries } from "./dictionaries";

interface I18nValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: (key: string) => string;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
}

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = "bmsb-locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Priorite au parametre d'URL ?lang= : il porte la langue reellement
    // utilisee pendant le parcours (ex. retour de paiement vers /confirmation),
    // independamment de l'etat global stocke. Sinon, on retombe sur le choix
    // memorise dans le localStorage.
    const param = new URLSearchParams(window.location.search).get("lang");
    if (param === "fr" || param === "he") {
      setLocaleState(param);
      localStorage.setItem(STORAGE_KEY, param);
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "fr" || stored === "he") setLocaleState(stored);
  }, []);

  const dir: "ltr" | "rtl" = locale === "he" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
      document.documentElement.classList.toggle("hebrew-page", locale === "he");
    }
  }, [locale, dir]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "fr" ? "he" : "fr");
  }, [locale, setLocale]);

  const t = useCallback(
    (key: string) => dictionaries[locale][key] ?? dictionaries.fr[key] ?? key,
    [locale],
  );

  const value = useMemo<I18nValue>(
    () => ({ locale, dir, t, setLocale, toggleLocale }),
    [locale, dir, t, setLocale, toggleLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
