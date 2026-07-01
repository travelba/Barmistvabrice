"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { EVENT } from "@/lib/config";

export function SiteHeader({
  homeHref = "/",
  reserveHref = "/reservation",
}: {
  homeHref?: string;
  reserveHref?: string;
} = {}) {
  const { t, toggleLocale, locale } = useI18n();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-navy-deep/90 backdrop-blur-md py-3 shadow-lg" : "py-5"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 sm:px-10">
        <Link href={homeHref} className="flex flex-col leading-none">
          <span className="kicker text-gold-light">Bar Mitsvah</span>
          <span className="font-serif text-xl text-cream">{EVENT.childName}</span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={toggleLocale}
            className="rounded-full border border-cream/25 px-3.5 py-1.5 text-xs font-medium text-cream/85 transition hover:border-cream/60 hover:text-cream"
            aria-label="Changer de langue"
          >
            {locale === "fr" ? "עברית" : "Français"}
          </button>
          <Link href={reserveHref} className="btn-gold rounded-full px-6 py-2.5 text-sm">
            {t("nav.reserve")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
