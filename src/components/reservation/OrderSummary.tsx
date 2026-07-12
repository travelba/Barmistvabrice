"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { formatEuro } from "@/lib/pricing";
import { useWizard } from "./WizardContext";

export function OrderSummary() {
  const { t } = useI18n();
  const { price, selectedHotel, includeFlight } = useWizard();

  return (
    <aside className="card sticky top-24 rounded-2xl p-6">
      <h3 className="font-serif text-xl text-navy">{t("recap.title")}</h3>
      <div className="my-4 gold-rule" />

      {selectedHotel ? (
        <p className="mb-3 text-sm font-medium text-navy">{selectedHotel.name}</p>
      ) : (
        <p className="mb-3 text-sm text-muted">{t("hotel.title")}</p>
      )}

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">{t("recap.rooms")}</dt>
          <dd className="text-navy">{formatEuro(price?.roomsTotalCents ?? 0)}</dd>
        </div>
        {includeFlight && (
          <div className="flex justify-between">
            <dt className="text-muted">
              {t("recap.flight")} ({price?.passengerCount ?? 0} {t("recap.passengers")})
            </dt>
            <dd className="text-navy">{formatEuro(price?.flightTotalCents ?? 0)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex items-end justify-between border-t border-navy/10 pt-4">
        <span className="text-sm font-medium text-navy">{t("recap.total")}</span>
        <span className="font-serif text-3xl text-gold">{formatEuro(price?.totalCents ?? 0)}</span>
      </div>
    </aside>
  );
}
