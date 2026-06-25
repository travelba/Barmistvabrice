"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { RsvpForm } from "@/components/ceremony/RsvpForm";
import { AddToCalendar } from "@/components/ceremony/AddToCalendar";
import { HebrewArch } from "@/components/ceremony/HebrewArch";
import { useI18n } from "@/i18n/I18nProvider";
import { EVENT, INVITATION } from "@/lib/config";

const HERO =
  "https://images.unsplash.com/photo-1492321936769-b49830bc1d1e?auto=format&fit=crop&w=2000&q=80";

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === "he" ? "he-IL" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Ceremonie() {
  const { t, locale, toggleLocale } = useI18n();

  return (
    <main className="flex-1">
      {/* En-tete minimal — aucune mention du voyage */}
      <header className="fixed inset-x-0 top-0 z-50 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5">
          <div className="flex flex-col leading-none">
            <span className="kicker text-gold-light">Bar Mitsvah</span>
            <span className="font-serif text-xl text-cream">{EVENT.childName}</span>
          </div>
          <button
            onClick={toggleLocale}
            className="rounded-full border border-gold/40 px-3 py-1 text-xs font-medium text-cream/90 transition hover:bg-gold/15"
            aria-label="Changer de langue"
          >
            {locale === "fr" ? "עברית" : "Français"}
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HERO})` }} />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center text-cream">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="kicker text-gold-light"
          >
            {t("ceremony.hero.kicker")}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1 }}
            className="mt-4 font-serif text-5xl sm:text-7xl"
          >
            {EVENT.childName}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="mx-auto my-6 gold-rule"
          />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            className="font-serif text-2xl text-sky sm:text-3xl"
          >
            {t("ceremony.hero.title")}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.55 }}
            className="mt-3 text-cream/80"
          >
            {t("ceremony.hero.invite")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
            className="mt-10"
          >
            <a href="#rsvp" className="btn-gold inline-block rounded-full px-9 py-4 text-base">
              {t("ceremony.hero.cta")}
            </a>
          </motion.div>
        </div>

        <div className="absolute bottom-8 z-10 w-full">
          <p className="kicker mb-4 text-center text-gold-light">{t("ceremony.countdown")}</p>
          <Countdown target={EVENT.tephilinesDate} />
        </div>
      </section>

      {/* FAIRE-PART */}
      <section className="bg-cream py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          {/* Verset des Tephilines (Oukchartam) en arche typographique */}
          <div className="mx-auto max-w-md text-aegean">
            <HebrewArch text="וקשרתם לאות על ידך והיו לטטפת בין עיניך" />
          </div>
          <p className="kicker mt-2 text-gold">Téphilines — Oukchartam</p>

          <div className="mx-auto my-8 gold-rule" />

          {/* Hotes */}
          <div className="space-y-1 font-serif text-xl text-navy sm:text-2xl">
            {INVITATION.hosts.map((h) => (
              <p key={h}>{h}</p>
            ))}
          </div>

          <p className="mx-auto mt-6 max-w-lg text-muted">{INVITATION.announce}</p>
          <h2 className="mt-4 font-serif text-5xl text-navy sm:text-6xl">{EVENT.childName}</h2>

          <p className="mt-8 text-sm uppercase tracking-widest text-gold">
            {INVITATION.specialThoughtLabel}
          </p>
          <p className="mt-1 font-serif text-lg text-navy">{INVITATION.specialThought}</p>

          <div className="mx-auto my-10 gold-rule" />

          {/* Details ceremonie */}
          <p className="text-muted">La mise des Téphilines aura lieu le</p>
          <p className="mt-2 font-serif text-3xl capitalize text-navy">
            {formatDate(EVENT.tephilinesDate, locale)}
          </p>
          <p className="mt-6 text-muted">en la</p>
          <p className="font-serif text-2xl text-navy">{EVENT.tephilinesPlace}</p>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-muted">
            <MapPin className="h-4 w-4 text-gold" /> {EVENT.tephilinesAddress}
          </p>
          <p className="mt-4 font-serif text-xl text-gold">{INVITATION.ceremonyTimeLabel}</p>
          <p className="mt-6 italic text-muted">{INVITATION.brunch}</p>

          <div className="mt-10">
            <AddToCalendar />
          </div>
        </div>
      </section>

      {/* RSVP */}
      <section id="rsvp" className="bg-cream py-24">
        <div className="mx-auto max-w-6xl px-5">
          <RsvpForm />
        </div>
      </section>

      <footer className="bg-navy-deep py-10 text-center text-cream/60">
        <p className="font-serif text-lg text-cream">{EVENT.childName}</p>
        <p className="mt-1 text-sm">{EVENT.agencyName}</p>
      </footer>
    </main>
  );
}
