"use client";

import { Plane } from "lucide-react";
import { EVENT, FLIGHT } from "@/lib/config";
import { useI18n } from "@/i18n/I18nProvider";

interface BoardingPassProps {
  passengerName: string;
  dateOfBirth?: string;
  bookingRef?: string;
  seq?: number;
  /** Image (data URL) du QR code. Sinon un motif "wallet" décoratif est affiché. */
  codeSrc?: string;
}

function Leg({
  label,
  leg,
}: {
  label: string;
  leg: typeof FLIGHT.outbound | typeof FLIGHT.inbound;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-aegean">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <p className="font-serif text-[2.4rem] leading-none text-ink">{leg.fromCode}</p>
          <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted">{leg.fromCity}</p>
        </div>
        <div className="flex flex-1 flex-col items-center pb-2">
          <span className="font-mono text-[10px] text-muted">{leg.flightNo}</span>
          <div className="my-1 flex w-full items-center gap-1.5 text-aegean/40">
            <span className="h-px flex-1 bg-current" />
            <Plane className="h-3.5 w-3.5 text-aegean" />
            <span className="h-px flex-1 bg-current" />
          </div>
          <span className="text-[10px] tabular-nums text-muted">
            {leg.depTime} – {leg.arrTime}
          </span>
        </div>
        <div className="text-right">
          <p className="font-serif text-[2.4rem] leading-none text-ink">{leg.toCode}</p>
          <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted">{leg.toCity}</p>
        </div>
      </div>
      <p className="mt-1 text-right text-[10px] uppercase tracking-wide text-muted">{leg.dateLabel}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-1 truncate text-sm text-ink">{value}</p>
    </div>
  );
}

/**
 * Billet d'embarquement — esprit "wallet" éditorial.
 * Composant présentational (serveur ou client).
 */
export function BoardingPass({
  passengerName,
  dateOfBirth,
  bookingRef,
  seq,
  codeSrc,
}: BoardingPassProps) {
  const { t } = useI18n();
  const name = passengerName.trim() || t("pass.yourName");
  const ref = (bookingRef ?? "—").slice(0, 8).toUpperCase();

  return (
    <div className="flex w-full overflow-hidden rounded-[1.25rem] bg-paper ring-1 ring-line">
      {/* Corps */}
      <div className="flex-1 p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-serif text-xl leading-none text-ink">{FLIGHT.airline}</p>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-muted">
              {FLIGHT.airlineBy}
            </p>
          </div>
          <span className="rounded-full border border-ink/15 px-3 py-1 text-[9px] uppercase tracking-[0.2em] text-ink/70">
            {t("pass.boardingPass")}
          </span>
        </div>

        <div className="mt-7 space-y-6">
          <Leg label={t("flight.outbound")} leg={FLIGHT.outbound} />
          <div className="h-px w-full bg-line" />
          <Leg label={t("flight.return")} leg={FLIGHT.inbound} />
        </div>

        <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Field label={t("flight.passenger")} value={name} />
          <Field label={t("pass.dob")} value={dateOfBirth || "—"} />
          <Field label={t("pass.boardingTime")} value={FLIGHT.outbound.boarding} />
          <Field label={t("pass.cabin")} value={t("pass.private")} />
        </div>
      </div>

      {/* Souche */}
      <div className="relative flex w-32 shrink-0 flex-col justify-between bg-navy p-5 text-cream sm:w-40">
        <span className="absolute -left-[7px] top-0 h-full w-3.5 [background:radial-gradient(circle_at_left,transparent_0,transparent_6px,var(--cream)_6px)] bg-[length:100%_15px]" />
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-gold-light">{EVENT.destination}</p>
          <p className="mt-1.5 font-serif text-lg leading-tight">{EVENT.title}</p>
          <p className="mt-2 text-[10px] text-cream/60">09 — 11 OCT 2026</p>
        </div>

        <div className="mt-4">
          {codeSrc ? (
            <img
              src={codeSrc}
              alt="QR"
              className="h-20 w-20 rounded-md bg-white p-1"
            />
          ) : (
            <div className="h-20 w-20 rounded-md bg-white p-2">
              <div className="wallet-code h-full w-full text-navy" />
            </div>
          )}
          <p className="mt-2 text-[9px] uppercase tracking-[0.15em] text-cream/60">{t("flight.passenger")}</p>
          <p className="truncate text-sm">{name}</p>
          <p className="mt-1 font-mono text-[9px] tracking-widest text-cream/50">
            {ref}{typeof seq === "number" ? ` · ${seq}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
