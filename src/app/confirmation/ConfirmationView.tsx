"use client";

import Link from "next/link";
import { CheckCircle2, Clock, FileDown } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatEuro } from "@/lib/pricing";
import { EVENT, FLIGHT, TRIP_NIGHTS } from "@/lib/config";
import { BoardingPasses } from "@/components/flight/BoardingPasses";
import { HotelVoucherDownload } from "@/components/hotel/HotelVoucherDownload";
import { AgencySupportBlock } from "@/components/support/AgencySupportBlock";
import type { Booking } from "@/lib/types";

interface Props {
  booking: Booking | null;
  paid: boolean;
  hotelMeta: { location?: string; stars?: number; photo?: string };
  /** Lien signé vers le PDF carnet de voyage (calculé côté serveur). */
  docsUrl: string | null;
}

export function ConfirmationView({ booking, paid, hotelMeta, docsUrl }: Props) {
  const { t, locale } = useI18n();
  // Retour vers la page voyage dans la langue du parcours.
  const homeHref = locale === "he" ? "/weekend-hebrew" : "/week-end";

  return (
    <main className="min-h-screen bg-navy px-5 py-16 text-cream">
      <div className="mx-auto w-full max-w-lg text-center">
        {paid ? (
          <CheckCircle2 className="mx-auto h-16 w-16 text-gold-light" />
        ) : (
          <Clock className="mx-auto h-16 w-16 text-gold-light" />
        )}
        <p className="kicker mt-6 text-gold-light">Bar Mitsvah · {EVENT.childName}</p>
        <h1 className="mt-3 font-serif text-4xl">
          {paid ? t("confirm.title") : t("confirm.pendingTitle")}
        </h1>
        <div className="mx-auto my-5 gold-rule" />

        {booking ? (
          <>
            <p className="text-cream/80">
              {paid
                ? t("confirm.thanks")
                    .replace("{name}", booking.groupName)
                    .replace("{child}", EVENT.childName)
                : t("confirm.processing")}
            </p>

            <div className="glass mt-8 rounded-2xl p-6 text-left">
              <p className="text-xs text-cream/60">{t("confirm.ref")}</p>
              <p className="font-mono text-sm text-cream">{booking.id}</p>

              <div className="my-4 h-px bg-cream/15" />
              <p className="font-serif text-lg">{booking.hotelName}</p>
              <ul className="mt-2 space-y-2 text-sm text-cream/80">
                {booking.rooms.map((r) => (
                  <li key={r.roomTypeId} className="flex items-start justify-between">
                    <span>
                      <span className="block">
                        {r.quantity}× {r.roomName}
                      </span>
                      <span className="text-xs text-cream/50">
                        {formatEuro(r.priceCents)} × {TRIP_NIGHTS} {t("common.nights")}
                      </span>
                    </span>
                    <span>{formatEuro(r.priceCents * r.quantity * TRIP_NIGHTS)}</span>
                  </li>
                ))}
              </ul>

              {booking.flightTotalCents > 0 && (
                <>
                  <div className="my-4 h-px bg-cream/15" />
                  <div className="flex justify-between text-sm text-cream/80">
                    <span>
                      {t("flight.private")} · {booking.passengerCount}{" "}
                      {t("confirm.passengersShort")}
                    </span>
                    <span>{formatEuro(booking.flightTotalCents)}</span>
                  </div>
                </>
              )}

              <div className="mt-4 flex items-end justify-between border-t border-cream/20 pt-4">
                <span className="text-sm">{t("confirm.totalPaid")}</span>
                <span className="font-serif text-2xl text-gold-light">
                  {formatEuro(booking.totalCents)}
                </span>
              </div>
            </div>

            {paid && (
              <p className="mt-4 text-sm text-cream/70">{t("confirm.emailSent")}</p>
            )}

            <AgencySupportBlock variant="dark" className="mt-6" />
          </>
        ) : (
          <>
            <p className="text-cream/80">{t("confirm.notFound")}</p>
            <AgencySupportBlock variant="dark" className="mt-8" />
          </>
        )}
      </div>

      {paid && booking && docsUrl && (
        <div className="mx-auto mt-10 max-w-2xl text-center">
          <a
            href={docsUrl}
            className="btn-gold inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm"
          >
            <FileDown className="h-4 w-4" /> {t("confirm.downloadPdf")}
          </a>
          <p className="mt-2 text-xs text-cream/55">{t("confirm.downloadPdfSub")}</p>
        </div>
      )}

      {paid && booking && booking.rooms.length > 0 && (
        <section className="mx-auto mt-16 w-full max-w-2xl">
          <p className="kicker text-center text-gold-light">{t("place.destination")}</p>
          <h2 className="mt-3 text-center font-serif text-3xl">{t("confirm.hotelVoucherTitle")}</h2>
          <div className="mx-auto my-5 gold-rule" />
          <p className="mx-auto max-w-md text-center text-sm text-cream/70">
            {t("confirm.hotelVoucherSub")}
          </p>
          <div className="mt-10">
            <HotelVoucherDownload
              hotelName={booking.hotelName}
              location={hotelMeta.location}
              stars={hotelMeta.stars}
              photo={hotelMeta.photo}
              rooms={booking.rooms}
              roomsTotalCents={booking.roomsTotalCents}
              guestName={booking.groupName}
              guestCount={booking.passengerCount}
              bookingRef={booking.id}
            />
          </div>
        </section>
      )}

      {/* Billets d'embarquement : uniquement si le vol fait partie de la réservation. */}
      {paid && booking && booking.passengers.length > 0 && booking.flightTotalCents > 0 && (
        <section className="mx-auto mt-16 w-full max-w-2xl">
          <p className="kicker text-center text-gold-light">{FLIGHT.airline}</p>
          <h2 className="mt-3 text-center font-serif text-3xl">{t("confirm.boardingTitle")}</h2>
          <div className="mx-auto my-5 gold-rule" />
          <p className="mx-auto max-w-md text-center text-sm text-cream/70">
            {t("confirm.boardingSub")}
          </p>
          <div className="mt-10">
            <BoardingPasses passengers={booking.passengers} bookingRef={booking.id} />
          </div>
        </section>
      )}

      <div className="mt-14 text-center">
        <Link href={homeHref} className="btn-gold inline-block rounded-full px-8 py-3 text-sm">
          {t("confirm.backHome")}
        </Link>
      </div>
    </main>
  );
}
