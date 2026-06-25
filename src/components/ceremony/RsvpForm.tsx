"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Minus, Plus } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const MAX_GUESTS = 6;

export function RsvpForm() {
  const { t, locale } = useI18n();
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [attending, setAttending] = useState(true);
  const [guestCount, setGuestCount] = useState(1);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const emailValid = /.+@.+\..+/.test(email);
  const canSubmit =
    lastName.trim().length > 1 &&
    firstName.trim().length > 0 &&
    emailValid &&
    phone.trim().length >= 6 &&
    status !== "sending";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          email,
          phone,
          attending,
          guestCount: attending ? guestCount : 1,
          locale,
        }),
      });
      if (!res.ok) throw new Error("rsvp");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="card mx-auto max-w-xl rounded-2xl p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-gold" />
        <p className="mt-4 font-serif text-2xl text-navy">
          {attending ? t("ceremony.rsvp.successYes") : t("ceremony.rsvp.successNo")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-xl rounded-2xl p-8">
      <h2 className="font-serif text-3xl text-navy">{t("ceremony.rsvp.title")}</h2>
      <p className="mt-2 text-muted">{t("ceremony.rsvp.subtitle")}</p>

      <div className="mt-8 grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="rsvp-lastname">
              {t("ceremony.rsvp.lastName")}
            </label>
            <input
              id="rsvp-lastname"
              className="field"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="rsvp-firstname">
              {t("ceremony.rsvp.firstName")}
            </label>
            <input
              id="rsvp-firstname"
              className="field"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="rsvp-email">
              {t("ceremony.rsvp.email")}
            </label>
            <input
              id="rsvp-email"
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="rsvp-phone">
              {t("ceremony.rsvp.phone")}
            </label>
            <input
              id="rsvp-phone"
              type="tel"
              className="field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
        </div>

        <div>
          <span className="field-label">{t("ceremony.rsvp.attending")}</span>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setAttending(true)}
              className={`rounded-xl border px-4 py-3 text-sm transition ${
                attending
                  ? "border-gold bg-gold/10 text-navy"
                  : "border-navy/15 text-muted hover:border-navy/30"
              }`}
            >
              {t("ceremony.rsvp.yes")}
            </button>
            <button
              type="button"
              onClick={() => setAttending(false)}
              className={`rounded-xl border px-4 py-3 text-sm transition ${
                !attending
                  ? "border-gold bg-gold/10 text-navy"
                  : "border-navy/15 text-muted hover:border-navy/30"
              }`}
            >
              {t("ceremony.rsvp.no")}
            </button>
          </div>
        </div>

        {attending && (
          <div>
            <span className="field-label">{t("ceremony.rsvp.guests")}</span>
            <div className="mt-2 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setGuestCount((n) => Math.max(1, n - 1))}
                disabled={guestCount <= 1}
                aria-label="Retirer une personne"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/20 text-ink transition hover:border-ink hover:bg-ink hover:text-cream disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-10 text-center font-serif text-3xl tabular-nums text-ink">
                {guestCount}
              </span>
              <button
                type="button"
                onClick={() => setGuestCount((n) => Math.min(MAX_GUESTS, n + 1))}
                disabled={guestCount >= MAX_GUESTS}
                aria-label="Ajouter une personne"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/20 text-ink transition hover:border-ink hover:bg-ink hover:text-cream disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {status === "error" && (
        <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {t("ceremony.rsvp.error")}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="btn-gold mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm disabled:opacity-40"
      >
        {status === "sending" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {t("ceremony.rsvp.sending")}
          </>
        ) : (
          t("ceremony.rsvp.submit")
        )}
      </button>
    </form>
  );
}
