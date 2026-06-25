"use client";

import { MapPin, Star, BedDouble, CalendarCheck, CalendarX, Moon, Users } from "lucide-react";
import { EVENT, TRIP_NIGHTS } from "@/lib/config";
import { formatEuro } from "@/lib/pricing";
import { useI18n } from "@/i18n/I18nProvider";

interface VoucherRoom {
  roomName: string;
  quantity: number;
  priceCents: number;
}

interface HotelVoucherProps {
  hotelName: string;
  location?: string;
  stars?: number;
  photo?: string;
  rooms: VoucherRoom[];
  roomsTotalCents: number;
  guestName: string;
  guestCount: number;
  bookingRef: string;
}

function localeDate(iso: string, locale: "fr" | "he") {
  return new Date(iso + "T12:00:00").toLocaleDateString(
    locale === "he" ? "he-IL" : "fr-FR",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-aegean" />
      <div>
        <p className="text-[9px] uppercase tracking-[0.18em] text-muted">{label}</p>
        <p className="mt-0.5 capitalize text-ink">{value}</p>
      </div>
    </div>
  );
}

/**
 * Bon de confirmation d'hébergement — esprit voucher éditorial.
 * Composant présentational (serveur ou client).
 */
export function HotelVoucher({
  hotelName,
  location,
  stars,
  photo,
  rooms,
  roomsTotalCents,
  guestName,
  guestCount,
  bookingRef,
}: HotelVoucherProps) {
  const { t, locale } = useI18n();
  const localPhoto = photo && photo.startsWith("/") ? photo : null;
  const ref = (bookingRef || "—").slice(0, 8).toUpperCase();

  return (
    <div className="overflow-hidden rounded-[1.25rem] bg-paper ring-1 ring-line">
      {/* Bannière */}
      <div className="relative flex h-44 items-end bg-navy">
        {localPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={localPhoto}
            alt={hotelName}
            className="absolute inset-0 h-full w-full object-cover opacity-65"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/45 to-transparent" />
        <div className="relative z-10 p-6 text-cream">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold-light">
            {t("voucher.header")}
          </p>
          <h3 className="mt-1.5 font-serif text-3xl leading-tight">{hotelName}</h3>
          <div className="mt-2 flex items-center gap-3 text-cream/85">
            {location && (
              <span className="flex items-center gap-1 text-xs">
                <MapPin className="h-3.5 w-3.5" /> {location}
              </span>
            )}
            {typeof stars === "number" && stars > 0 && (
              <span className="flex items-center gap-0.5">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-gold-light text-gold-light" />
                ))}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Corps */}
      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Stat icon={CalendarCheck} label={t("voucher.arrival")} value={localeDate(EVENT.tripStartDate, locale)} />
          <Stat icon={CalendarX} label={t("voucher.departure")} value={localeDate(EVENT.tripEndDate, locale)} />
          <Stat icon={Moon} label={t("voucher.nights")} value={t("voucher.nightsUnit").replace("{n}", String(TRIP_NIGHTS))} />
          <Stat icon={Users} label={t("voucher.travelers")} value={t("voucher.personsUnit").replace("{n}", String(guestCount))} />
        </div>

        <div className="my-6 h-px bg-line" />

        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-aegean">
          <BedDouble className="h-4 w-4" /> {t("voucher.booked")}
        </p>
        <ul className="mt-3 space-y-2.5">
          {rooms.map((r, i) => (
            <li key={i} className="flex items-start justify-between text-sm">
              <span>
                <span className="block text-ink">
                  {r.quantity}× {r.roomName}
                </span>
                <span className="text-xs text-muted">
                  {formatEuro(r.priceCents)} × {t("voucher.nightsUnit").replace("{n}", String(TRIP_NIGHTS))}
                </span>
              </span>
              <span className="text-ink">{formatEuro(r.priceCents * r.quantity * TRIP_NIGHTS)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-end justify-between border-t border-line pt-5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted">{t("voucher.bookedFor")}</p>
            <p className="text-ink">{guestName}</p>
            <p className="mt-1 font-mono text-[10px] tracking-widest text-muted">{t("confirm.ref")} {ref}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted">{t("voucher.totalHotel")}</p>
            <p className="font-serif text-3xl text-ink">{formatEuro(roomsTotalCents)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
