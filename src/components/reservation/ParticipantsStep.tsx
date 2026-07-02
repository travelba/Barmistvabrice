"use client";

import { Plane, ScrollText, Trash2, UserPlus, Users } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatEuro } from "@/lib/pricing";
import { EVENT } from "@/lib/config";
import { suggestEmailCorrection } from "@/lib/email-typo";
import { defaultCountryForLocale, isValidPhone, normalizePhoneE164, phonePlaceholder } from "@/lib/phone";
import { useWizard } from "./WizardContext";

export function ParticipantsStep() {
  const { t, locale } = useI18n();
  const {
    contact,
    setContact,
    flight,
    passengers,
    addPassenger,
    updatePassenger,
    removePassenger,
    ceremonyAttending,
    setCeremonyAttending,
    ceremonyGuestCount,
    setCeremonyGuestCount,
  } = useWizard();

  const ceremonyDate = new Date(EVENT.tephilinesDate).toLocaleDateString(
    locale === "he" ? "he-IL" : "fr-FR",
    { weekday: "long", day: "numeric", month: "long" },
  );

  const emailSuggestion = suggestEmailCorrection(contact.email);

  return (
    <div className="animate-float-up">
      <h2 className="font-serif text-3xl text-navy">{t("participants.title")}</h2>
      <p className="mt-2 text-muted">{t("participants.subtitle")}</p>

      {/* Coordonnees du responsable */}
      <div className="mt-8">
        <h3 className="kicker text-gold">{t("participants.contactSection")}</h3>
        <div className="mt-4 grid gap-5">
          <div>
            <label className="field-label" htmlFor="groupName">
              {t("contact.groupName")}
            </label>
            <input
              id="groupName"
              className="field"
              value={contact.groupName}
              onChange={(e) => setContact({ groupName: e.target.value })}
              placeholder="Famille Bechet"
              autoComplete="name"
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="email">
                {t("contact.email")}
              </label>
              <input
                id="email"
                type="email"
                className="field"
                value={contact.email}
                onChange={(e) => setContact({ email: e.target.value })}
                placeholder="vous@exemple.com"
                autoComplete="email"
              />
              {emailSuggestion && (
                <button
                  type="button"
                  onClick={() => setContact({ email: emailSuggestion })}
                  className="mt-1.5 text-sm text-gold hover:underline"
                >
                  {t("contact.emailTypo").replace("{email}", emailSuggestion)}
                </button>
              )}
            </div>
            <div>
              <label className="field-label" htmlFor="phone">
                {t("contact.phone")}
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                dir="ltr"
                className="field"
                value={contact.phone}
                onChange={(e) => setContact({ phone: e.target.value })}
                onBlur={() => {
                  const normalized = normalizePhoneE164(
                    contact.phone,
                    defaultCountryForLocale(locale),
                  );
                  if (normalized) setContact({ phone: normalized });
                }}
                placeholder={phonePlaceholder(locale)}
                autoComplete="tel"
              />
              {contact.phone.trim().length > 0 &&
                !isValidPhone(contact.phone, defaultCountryForLocale(locale)) && (
                  <p className="mt-1.5 text-sm text-red-500">{t("contact.phoneInvalid")}</p>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Liste des participants */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h3 className="kicker text-gold">{t("participants.listSection")}</h3>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Users className="h-4 w-4" /> {passengers.length} {t("rooms.persons")}
          </span>
        </div>

        {flight && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-aegean/5 px-4 py-3 text-sm text-navy">
            <Plane className="h-4 w-4 text-gold" />
            {t("participants.flightNote").replace(
              "{price}",
              formatEuro(flight.pricePerPassengerCents),
            )}
          </p>
        )}

        <div className="mt-5 space-y-4">
          {passengers.map((p, i) => (
            <div key={i} className="card rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-serif text-lg text-navy">
                  {t("participants.person")} {i + 1}
                </h4>
                {passengers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePassenger(i)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t("flight.remove")}
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="field-label">{t("flight.firstName")}</label>
                  <input
                    className="field"
                    value={p.firstName}
                    onChange={(e) => updatePassenger(i, { firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">{t("flight.lastName")}</label>
                  <input
                    className="field"
                    value={p.lastName}
                    onChange={(e) => updatePassenger(i, { lastName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">{t("flight.dob")}</label>
                  <input
                    type="date"
                    className="field"
                    max={new Date().toISOString().slice(0, 10)}
                    value={p.dateOfBirth}
                    onChange={(e) => updatePassenger(i, { dateOfBirth: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addPassenger}
          className="btn-outline mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm"
        >
          <UserPlus className="h-4 w-4" /> {t("participants.add")}
        </button>
      </div>

      {/* Mise des Tephilines */}
      <div className="mt-10">
        <h3 className="flex items-center gap-2 kicker text-gold">
          <ScrollText className="h-4 w-4" /> {t("voyage.ceremony.title")}
        </h3>
        <p className="mt-2 text-sm text-muted">
          {t("voyage.ceremony.note")
            .replace("{date}", ceremonyDate)
            .replace("{place}", t("ceremony.place"))}
        </p>
        <p className="mt-4 field-label">{t("voyage.ceremony.question")}</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setCeremonyAttending(true)}
            className={`rounded-xl border px-4 py-3 text-sm transition ${
              ceremonyAttending
                ? "border-gold bg-gold/10 text-navy"
                : "border-navy/15 text-muted hover:border-navy/30"
            }`}
          >
            {t("voyage.ceremony.yes")}
          </button>
          <button
            type="button"
            onClick={() => setCeremonyAttending(false)}
            className={`rounded-xl border px-4 py-3 text-sm transition ${
              !ceremonyAttending
                ? "border-gold bg-gold/10 text-navy"
                : "border-navy/15 text-muted hover:border-navy/30"
            }`}
          >
            {t("voyage.ceremony.no")}
          </button>
        </div>

        {ceremonyAttending && (
          <div className="mt-4 max-w-xs">
            <label className="field-label" htmlFor="ceremonyGuestCount">
              {t("voyage.ceremony.guests")}
            </label>
            <input
              id="ceremonyGuestCount"
              type="number"
              inputMode="numeric"
              min={0}
              max={50}
              className="field"
              value={ceremonyGuestCount}
              onChange={(e) =>
                setCeremonyGuestCount(
                  Math.max(0, Math.min(50, parseInt(e.target.value, 10) || 0)),
                )
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
