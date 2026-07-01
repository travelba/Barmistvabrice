"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Plane, Hotel as HotelIcon } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Countdown } from "@/components/Countdown";
import { useI18n } from "@/i18n/I18nProvider";
import { EVENT, PROGRAM, FLIGHT } from "@/lib/config";
import { BoardingPass } from "@/components/flight/BoardingPass";

const HERO =
  "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?auto=format&fit=crop&w=2000&q=80";

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === "he" ? "he-IL" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ClassicVoyage() {
  const { t, locale } = useI18n();
  const program = PROGRAM[locale];

  return (
    <main className="v-classic flex-1 bg-cream">
      <SiteHeader homeHref="/classic/voyage" reserveHref="/classic/reservation" />

      {/* HERO */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO})` }}
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center text-cream">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="kicker text-gold-light"
          >
            {t("hero.kicker")}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1 }}
            className="mt-4 font-serif text-6xl sm:text-8xl"
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
            {t("hero.subtitle")}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.55 }}
            className="mt-3 text-cream/80"
          >
            {t("hero.invite")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.6 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-cream/85"
          >
            <span className="font-serif text-lg text-gold-light">{FLIGHT.outbound.fromCode}</span>
            <Plane className="h-4 w-4 text-gold-light" />
            <span className="font-serif text-lg text-gold-light">{FLIGHT.outbound.toCode}</span>
            <span className="text-cream/60">·</span>
            <span className="uppercase tracking-widest">{FLIGHT.aircraft} · {t("flight.private")}</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
            className="mt-10"
          >
            <Link href="/classic/reservation" className="btn-gold inline-block rounded-full px-9 py-4 text-base">
              {t("hero.cta")}
            </Link>
          </motion.div>
        </div>

        <div className="absolute bottom-8 z-10 w-full">
          <p className="kicker mb-4 text-center text-gold-light">{t("countdown.title")}</p>
          <Countdown target={EVENT.tripStartDate + "T10:00:00+02:00"} variant="classic" />
        </div>
      </section>

      {/* SAVE THE DATE */}
      <section className="bg-navy py-24 text-cream">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="kicker text-gold-light">{t("hero.dateLabel")}</p>
          <div className="mx-auto my-5 gold-rule" />
          <div className="grid gap-10 sm:grid-cols-2">
            <div className="flex flex-col items-center">
              <CalendarDays className="mb-3 h-7 w-7 text-gold-light" />
              <h3 className="font-serif text-2xl">{t("event.tephilines.title")}</h3>
              <p className="mt-2 capitalize text-sky">{formatDate(EVENT.tephilinesDate, locale)}</p>
              <p className="mt-1 text-cream/70">{t("ceremony.place")}</p>
              <p className="text-sm text-cream/60">{EVENT.tephilinesAddress}</p>
            </div>
            <div className="flex flex-col items-center">
              <Plane className="mb-3 h-7 w-7 text-gold-light" />
              <h3 className="font-serif text-2xl">{t("event.trip.title")}</h3>
              <p className="mt-2 capitalize text-sky">{formatDate(EVENT.tripStartDate, locale)}</p>
              <p className="mt-1 flex items-center gap-1 text-cream/70">
                <MapPin className="h-4 w-4" /> {t("place.destination")}, {t("place.greece")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BILLET D'EMBARQUEMENT */}
      <section className="bg-gradient-to-b from-navy to-navy-deep py-24 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="kicker text-gold-light">{FLIGHT.airline}</p>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl">{t("voyage.boarding.title")}</h2>
          <div className="mx-auto my-5 gold-rule" />
          <p className="mx-auto max-w-xl text-cream/75">
            {t("voyage.boarding.desc")
              .replace("{aircraft}", FLIGHT.aircraft)
              .replace("{city}", FLIGHT.outbound.fromCity)}
          </p>
          <div className="mt-10">
            <BoardingPass passengerName="" />
          </div>
          <Link href="/classic/reservation" className="btn-gold mt-10 inline-block rounded-full px-9 py-4">
            {t("voyage.boarding.cta")}
          </Link>
        </div>
      </section>

      {/* TRIP / RESERVATION TEASER */}
      <section className="bg-cream py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="kicker text-gold">{t("place.destination")}</p>
          <h2 className="mt-3 font-serif text-4xl text-navy sm:text-5xl">{t("event.trip.title")}</h2>
          <div className="mx-auto my-5 gold-rule" />
          <p className="mx-auto max-w-2xl text-muted">{t("event.trip.desc")}</p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <div className="card rounded-2xl p-8 text-left">
              <HotelIcon className="h-8 w-8 text-gold" />
              <h3 className="mt-4 font-serif text-2xl text-navy">{t("steps.hotel")}</h3>
              <p className="mt-2 text-sm text-muted">{t("hotel.subtitle")}</p>
            </div>
            <div className="card rounded-2xl p-8 text-left">
              <Plane className="h-8 w-8 text-gold" />
              <h3 className="mt-4 font-serif text-2xl text-navy">{t("flight.title")}</h3>
              <p className="mt-2 text-sm text-muted">{t("voyage.teaser.flightDesc")}</p>
            </div>
          </div>

          <Link href="/classic/reservation" className="btn-gold mt-12 inline-block rounded-full px-9 py-4">
            {t("hero.cta")}
          </Link>
        </div>
      </section>

      {/* PROGRAMME */}
      <section className="bg-navy py-24 text-cream">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center">
            <p className="kicker text-gold-light">{t("program.title")}</p>
            <div className="mx-auto my-5 gold-rule" />
          </div>

          <div className="mt-10 space-y-12">
            {program.map((day) => (
              <div key={day.date}>
                <h3 className="flex items-baseline gap-3 font-serif text-2xl text-gold-light">
                  {day.day}
                  <span className="text-base text-cream/60">{day.date}</span>
                </h3>
                <ol className="mt-5 space-y-4 border-s border-gold/25 ps-6">
                  {day.items.map((it, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -start-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-gold" />
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                        {it.time && (
                          <span className="shrink-0 font-serif text-lg text-gold-light tabular-nums">
                            {it.time}
                          </span>
                        )}
                        <span className="text-cream/85">{it.text}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-navy-deep py-10 text-center text-cream/60">
        <p className="font-serif text-lg text-cream">{EVENT.childName}</p>
        <p className="mt-1 text-sm">{EVENT.agencyName}</p>
      </footer>
    </main>
  );
}
