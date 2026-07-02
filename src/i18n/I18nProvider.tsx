"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
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

/* Langue initiale cote client : priorite au parametre d'URL ?lang= (il porte
   la langue reellement utilisee pendant le parcours, ex. retour de paiement
   vers /confirmation), sinon le choix memorise dans le localStorage.
   Lue via useSyncExternalStore : le SSR rend "fr", le client se resynchronise
   sans mismatch d'hydratation. */
const subscribeNoop = () => () => {};
function readInitialLocale(): Locale {
  const param = new URLSearchParams(window.location.search).get("lang");
  if (param === "fr" || param === "he") return param;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "he" ? "he" : "fr";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const initialLocale = useSyncExternalStore<Locale>(
    subscribeNoop,
    readInitialLocale,
    () => "fr",
  );
  const [override, setOverride] = useState<Locale | null>(null);
  const locale = override ?? initialLocale;

  const dir: "ltr" | "rtl" = locale === "he" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
      document.documentElement.classList.toggle("hebrew-page", locale === "he");
    }
    // Memorise la langue courante pour les pages suivantes.
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, locale);
  }, [locale, dir]);

  const setLocale = useCallback((l: Locale) => {
    setOverride(l);
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
