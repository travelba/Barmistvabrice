"use client";

import { Minus, Plus, Users } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatEuro } from "@/lib/pricing";
import { localizedRoomDescription } from "@/lib/i18n-content";
import { useWizard } from "./WizardContext";

export function RoomsStep() {
  const { t, locale } = useI18n();
  const { selectedHotel, rooms, setRoomQty, roomsCount, selectedCapacity, nights, passengers } =
    useWizard();

  if (!selectedHotel) return null;

  const participantCount = passengers.length;
  const capacityCovered = selectedCapacity >= participantCount;
  const maxRooms = participantCount;
  const maxRoomsReached = roomsCount >= maxRooms;

  return (
    <div className="animate-float-up">
      <h2 className="font-serif text-3xl text-navy">{t("rooms.title")}</h2>
      <p className="mt-2 text-muted">{t("rooms.subtitle")}</p>
      <p className="mt-1 text-sm text-gold">{t("rooms.nightsNote").replace("{n}", String(nights))}</p>
      <p className="mt-1 text-sm text-muted">
        {t("rooms.toHouse").replace("{n}", String(participantCount))}
      </p>
      <p className="mt-1 text-sm text-muted">
        {t("rooms.maxNote").replace("{n}", String(maxRooms))}
      </p>

      <div className="mt-8 space-y-4">
        {selectedHotel.roomTypes.map((rt) => {
          const qty = rooms[rt.id] ?? 0;
          const canAdd = qty < rt.available && !maxRoomsReached;
          return (
            <div
              key={rt.id}
              className="card flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rt.photos[0]}
                alt={rt.name}
                className="h-28 w-full rounded-xl object-cover sm:h-24 sm:w-36"
              />
              <div className="flex-1">
                <h3 className="font-serif text-xl text-navy">{rt.name}</h3>
                <p className="mt-1 flex items-center gap-3 text-sm text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-4 w-4" /> {rt.capacity} {t("rooms.persons")}
                  </span>
                  <span>
                    {rt.available} {t("rooms.available")}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted line-clamp-1">
                  {localizedRoomDescription(rt, locale)}
                </p>
                <p className="mt-2 font-serif text-lg text-gold">
                  {formatEuro(rt.priceCents)}{" "}
                  <span className="text-sm text-muted">{t("rooms.perStay")}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setRoomQty(rt.id, qty - 1)}
                  disabled={qty <= 0}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-navy/20 text-navy transition enabled:hover:bg-navy enabled:hover:text-cream disabled:opacity-30"
                  aria-label={t("flight.remove")}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center font-serif text-xl text-navy tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => setRoomQty(rt.id, qty + 1)}
                  disabled={!canAdd}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gold bg-gold/10 text-navy transition enabled:hover:bg-gold disabled:opacity-30"
                  aria-label={t("rooms.add")}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl bg-navy px-5 py-4 text-cream">
        <span className="text-sm">{t("rooms.totalCapacity")}</span>
        <span className="font-serif text-xl">
          {selectedCapacity} / {participantCount} {t("rooms.persons")}
        </span>
      </div>
      {selectedCapacity > 0 && (
        <p className={`mt-2 text-sm ${capacityCovered ? "text-emerald-600" : "text-red-500"}`}>
          {capacityCovered ? t("rooms.capacityOk") : t("rooms.capacityShort")}
        </p>
      )}
      {maxRoomsReached && (
        <p className="mt-2 text-sm text-gold">
          {t("rooms.maxReached").replace("{n}", String(maxRooms))}
        </p>
      )}
    </div>
  );
}
