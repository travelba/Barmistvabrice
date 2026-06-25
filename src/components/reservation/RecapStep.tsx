"use client";

import { Lock, Hotel as HotelIcon, Plane, ScrollText } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatEuro } from "@/lib/pricing";
import { EVENT } from "@/lib/config";
import { useWizard } from "./WizardContext";

export function RecapStep() {
  const { t, locale } = useI18n();
  const { selectedHotel, price, passengers, contact, ceremonyAttending } = useWizard();
  if (!price || !selectedHotel) return null;

  const ceremonyDate = new Date(EVENT.tephilinesDate).toLocaleDateString(
    locale === "he" ? "he-IL" : "fr-FR",
    { weekday: "long", day: "numeric", month: "long" },
  );

  return (
    <div className="animate-float-up">
      <h2 className="font-serif text-3xl text-navy">{t("recap.title")}</h2>
      <p className="mt-2 text-muted">{t("recap.subtitle")}</p>

      <div className="mt-8 space-y-5">
        <div className="card rounded-2xl p-5">
          <p className="text-sm text-muted">{contact.groupName}</p>
          <p className="text-xs text-muted">
            {contact.email} · {contact.phone}
          </p>
        </div>

        <div className="card rounded-2xl p-5">
          <h3 className="flex items-center gap-2 font-serif text-xl text-navy">
            <HotelIcon className="h-5 w-5 text-gold" /> {selectedHotel.name}
          </h3>
          <ul className="mt-3 space-y-2">
            {price.rooms.map((r) => (
              <li key={r.roomTypeId} className="flex justify-between text-sm">
                <span className="text-navy">
                  {r.quantity}× {r.roomName}
                  <span className="block text-xs text-muted">
                    {formatEuro(r.unitCents)} × {price.nights} {price.nights > 1 ? "nuits" : "nuit"}
                    {r.quantity > 1 ? ` × ${r.quantity}` : ""}
                  </span>
                </span>
                <span className="text-muted">{formatEuro(r.lineCents)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card rounded-2xl p-5">
          <h3 className="flex items-center gap-2 font-serif text-xl text-navy">
            <Plane className="h-5 w-5 text-gold" /> {t("recap.flight")}
          </h3>
          <ul className="mt-3 space-y-1">
            {passengers.map((p, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-navy">
                  {p.firstName} {p.lastName}
                </span>
                <span className="text-muted">{p.dateOfBirth}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex justify-between text-sm">
            <span className="text-navy">
              {price.passengerCount} × {formatEuro(price.flightUnitCents)}
            </span>
            <span className="text-muted">{formatEuro(price.flightTotalCents)}</span>
          </p>
        </div>

        <div className="card rounded-2xl p-5">
          <h3 className="flex items-center gap-2 font-serif text-xl text-navy">
            <ScrollText className="h-5 w-5 text-gold" /> {t("voyage.ceremony.title")}
          </h3>
          <p className="mt-2 text-sm text-muted">
            {ceremonyAttending
              ? `${t("voyage.ceremony.yes")} — ${ceremonyDate}, ${EVENT.tephilinesPlace}`
              : t("voyage.ceremony.no")}
          </p>
        </div>
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
        <Lock className="h-3.5 w-3.5" /> {t("recap.securedBy")}
      </p>
    </div>
  );
}
