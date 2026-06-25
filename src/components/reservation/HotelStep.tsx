"use client";

import { MapPin, Star, Check } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatEuro } from "@/lib/pricing";
import { localizedHotelDescription, localizedHotelLocation } from "@/lib/i18n-content";
import { useWizard } from "./WizardContext";

export function HotelStep() {
  const { t, locale } = useI18n();
  const { hotels, hotelId, setHotelId } = useWizard();

  return (
    <div className="animate-float-up">
      <h2 className="font-serif text-3xl text-navy">{t("hotel.title")}</h2>
      <p className="mt-2 text-muted">{t("hotel.subtitle")}</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {hotels.map((h) => {
          const selected = h.id === hotelId;
          const soldOut = h.remaining <= 0;
          const minPrice = Math.min(...h.roomTypes.map((r) => r.priceCents));
          return (
            <button
              key={h.id}
              type="button"
              disabled={soldOut}
              onClick={() => setHotelId(h.id)}
              className={`card group overflow-hidden rounded-2xl text-left transition ${
                selected ? "ring-2 ring-gold" : "hover:-translate-y-1"
              } ${soldOut ? "opacity-60" : ""}`}
            >
              <div className="relative h-48 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={h.photos[0]}
                  alt={h.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute right-3 top-3 rounded-full bg-navy-deep/80 px-3 py-1 text-xs text-cream">
                  {soldOut ? t("hotel.soldout") : `${h.remaining} ${t("hotel.remaining")}`}
                </div>
                {selected && (
                  <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-navy-deep">
                    <Check className="h-3 w-3" /> {t("hotel.selected")}
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1 text-gold">
                  {Array.from({ length: h.stars }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-gold" />
                  ))}
                </div>
                <h3 className="mt-2 font-serif text-2xl text-navy">{h.name}</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                  <MapPin className="h-3.5 w-3.5" /> {localizedHotelLocation(h, locale)}
                </p>
                <p className="mt-3 line-clamp-2 text-sm text-muted">
                  {localizedHotelDescription(h, locale)}
                </p>
                <p className="mt-4 text-sm text-navy">
                  {t("common.from")}{" "}
                  <span className="font-serif text-xl text-gold">{formatEuro(minPrice)}</span>{" "}
                  <span className="text-muted">{t("rooms.perStay")}</span>
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
