"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, X } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { EVENT } from "@/lib/config";
import { useWizard } from "./WizardContext";
import { Stepper } from "./Stepper";
import { ParticipantsStep } from "./ParticipantsStep";
import { HotelStep } from "./HotelStep";
import { RoomsStep } from "./RoomsStep";
import { RecapStep } from "./RecapStep";
import { OrderSummary } from "./OrderSummary";

/* L'URL ne change pas pendant la vie du composant : abonnement inerte,
   seule la lecture initiale (cote client) compte. */
const subscribeNoop = () => () => {};
const readCanceledParam = () =>
  new URLSearchParams(window.location.search).get("canceled") === "1";

export function WizardShell() {
  const { t, toggleLocale, locale } = useI18n();
  const homeHref = locale === "he" ? "/weekend-hebrew" : "/week-end";

  // Retour d'un paiement Stripe abandonne (?canceled=1) : on informe
  // l'utilisateur qu'il peut reprendre sa reservation.
  const canceledInUrl = useSyncExternalStore(subscribeNoop, readCanceledParam, () => false);
  const [canceledDismissed, setCanceledDismissed] = useState(false);
  const showCanceled = canceledInUrl && !canceledDismissed;

  function dismissCanceled() {
    setCanceledDismissed(true);
    const params = new URLSearchParams(window.location.search);
    params.delete("canceled");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }

  const {
    loading,
    error,
    step,
    goNext,
    goBack,
    canContinue,
    submit,
    submitting,
    submitError,
  } = useWizard();

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-navy/10 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href={homeHref} className="flex flex-col leading-none">
            <span className="kicker text-gold">Bar Mitsvah</span>
            <span className="font-serif text-lg text-navy">{EVENT.childName}</span>
          </Link>
          <button
            onClick={toggleLocale}
            className="rounded-full border border-navy/20 px-3 py-1 text-xs text-navy transition hover:bg-navy hover:text-cream"
          >
            {locale === "fr" ? "עברית" : "Français"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10">
        {showCanceled && (
          <div className="mb-8 flex items-start justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div>
              <p className="font-medium">{t("cancel.title")}</p>
              <p className="mt-0.5">{t("cancel.subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={dismissCanceled}
              aria-label={t("common.back")}
              className="shrink-0 rounded-full p-1 transition hover:bg-amber-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <Stepper current={step} />

        {loading ? (
          <div className="mt-20 flex items-center justify-center gap-2 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" /> {t("common.loading")}
          </div>
        ) : error ? (
          <p className="mt-20 text-center text-red-500">{t(error)}</p>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
            <div>
              {step === 0 && <ParticipantsStep />}
              {step === 1 && <HotelStep />}
              {step === 2 && <RoomsStep />}
              {step === 3 && <RecapStep />}

              {submitError && (
                <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {submitError}
                </p>
              )}

              <div className="mt-10 flex items-center justify-between">
                <button
                  onClick={goBack}
                  disabled={step === 0}
                  className="btn-outline inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm disabled:invisible"
                >
                  <ArrowLeft className="h-4 w-4 rtl-flip" /> {t("common.back")}
                </button>

                {step < 3 ? (
                  <button
                    onClick={goNext}
                    disabled={!canContinue}
                    className="btn-gold inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm"
                  >
                    {t("common.next")} <ArrowRight className="h-4 w-4 rtl-flip" />
                  </button>
                ) : (
                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="btn-gold inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>{t("recap.pay")}</>
                    )}
                  </button>
                )}
              </div>
            </div>

            <OrderSummary />
          </div>
        )}
      </div>
    </main>
  );
}
