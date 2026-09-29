"use client";

import { useState, type ReactNode } from "react";
import { Check, FileUp, Loader2, Plus } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { IDENTITY_MAX_BYTES, type IdentityFields } from "@/lib/identity-manifest";
import type { IdentityDocumentPublic, IdentitySlotSeed } from "@/lib/identity-slots";

type Phase = "idle" | "reading" | "review" | "saving" | "done";

type Slot = IdentitySlotSeed & {
  phase: Phase;
  fields: IdentityFields | null;
  warnings: string[];
  file: File | null;
  error: string | null;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.heic,.heif,.pdf";

export function IdentityForm({
  bookingId,
  token,
  groupName,
  initialSlots,
}: {
  bookingId: string;
  token: string;
  groupName: string;
  initialSlots: IdentitySlotSeed[];
}) {
  const { t, locale, dir, toggleLocale } = useI18n();
  const [slots, setSlots] = useState<Slot[]>(() =>
    initialSlots.map((slot) => ({
      ...slot,
      phase: slot.saved ? "done" : "idle",
      fields: null,
      warnings: [],
      file: null,
      error: null,
    })),
  );

  function patch(key: string, partial: Partial<Slot>) {
    setSlots((prev) => prev.map((slot) => (slot.key === key ? { ...slot, ...partial } : slot)));
  }

  async function onFile(slot: Slot, file: File | undefined) {
    if (!file) return;
    if (file.size > IDENTITY_MAX_BYTES) {
      patch(slot.key, { error: "file_size", phase: "idle", file: null });
      return;
    }
    patch(slot.key, { phase: "reading", file, error: null, warnings: [] });
    const body = new FormData();
    body.set("bookingId", bookingId);
    body.set("token", token);
    body.set("file", file);
    try {
      const res = await fetch("/api/identity/extract", { method: "POST", body });
      const data = (await res.json()) as { error?: string; fields?: IdentityFields; warnings?: string[] };
      if (!res.ok || !data.fields) {
        patch(slot.key, { phase: "idle", error: data.error ?? "generic" });
        return;
      }
      patch(slot.key, {
        phase: "review",
        fields: { ...data.fields, specifications: data.fields.specifications ?? "" },
        warnings: data.warnings ?? [],
        error: null,
      });
    } catch {
      patch(slot.key, { phase: "idle", error: "generic" });
    }
  }

  async function onImport(slot: Slot) {
    if (!slot.file || !slot.fields) return;
    patch(slot.key, { phase: "saving", error: null });
    const body = new FormData();
    body.set("bookingId", bookingId);
    body.set("token", token);
    body.set("file", slot.file);
    body.set(
      "payload",
      JSON.stringify({ ...slot.fields, passengerIndex: slot.passengerIndex }),
    );
    try {
      const res = await fetch("/api/identity/import", { method: "POST", body });
      const data = (await res.json()) as { error?: string; document?: IdentityDocumentPublic };
      if (!res.ok || !data.document) {
        patch(slot.key, { phase: "review", error: data.error ?? "generic" });
        return;
      }
      patch(slot.key, {
        phase: "done",
        saved: data.document,
        firstName: data.document.firstName,
        lastName: data.document.lastName,
        file: null,
        error: null,
        warnings: [],
      });
    } catch {
      patch(slot.key, { phase: "review", error: "generic" });
    }
  }

  function addPerson() {
    setSlots((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        passengerIndex: null,
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        saved: null,
        phase: "idle",
        fields: null,
        warnings: [],
        file: null,
        error: null,
      },
    ]);
  }

  return (
    <main className="theme-taupe min-h-screen bg-[var(--paper-base)] px-5 py-12 text-[var(--text)]" dir={dir}>
      <div className="mx-auto w-full max-w-xl">
        <div className="flex items-start justify-between gap-4">
          <p className="kicker text-[var(--accent-deep)]">Bar Mitsvah · Shon Bechet</p>
          <button
            type="button"
            onClick={toggleLocale}
            className="shrink-0 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm"
          >
            {t("nav.lang")}
          </button>
        </div>
        <h1 className="mt-4 font-serif text-4xl">{t("id.title")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)]">
          {t("id.subtitle").replace("{name}", groupName)}
        </p>
        <p className="mt-2 text-xs text-[var(--text-soft)]">{t("id.privacy")}</p>

        <div className="mt-8 space-y-5">
          {slots.map((slot, index) => (
            <SlotCard
              key={slot.key}
              slot={slot}
              index={index}
              locale={locale}
              t={t}
              onFile={(file) => onFile(slot, file)}
              onChange={(fields) => patch(slot.key, { fields })}
              onImport={() => onImport(slot)}
              onReplace={() =>
                patch(slot.key, { phase: "idle", fields: null, warnings: [], file: null, error: null })
              }
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addPerson}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--accent)] px-5 py-2.5 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> {t("id.addPerson")}
        </button>
      </div>
    </main>
  );
}

function SlotCard({
  slot,
  index,
  locale,
  t,
  onFile,
  onChange,
  onImport,
  onReplace,
}: {
  slot: Slot;
  index: number;
  locale: string;
  t: (key: string) => string;
  onFile: (file: File | undefined) => void;
  onChange: (fields: IdentityFields) => void;
  onImport: () => void;
  onReplace: () => void;
}) {
  const saved = slot.saved;
  const title =
    [slot.fields?.firstName || slot.firstName, slot.fields?.lastName || slot.lastName]
      .filter(Boolean)
      .join(" ") || t("id.extra");
  const dateLocale = locale === "he" ? "he-IL" : "fr-FR";

  return (
    <section className="card rounded-2xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
        {t("id.passenger")} {index + 1}
      </p>
      <h2 className="mt-1 font-serif text-2xl">{title}</h2>
      {slot.dateOfBirth && slot.phase !== "review" && (
        <p className="mt-1 text-sm text-[var(--text-soft)]">
          {t("id.knownDob").replace(
            "{date}",
            formatIso(slot.dateOfBirth, dateLocale),
          )}
        </p>
      )}

      {slot.phase === "done" && saved && (
        <div className="mt-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-deep)]">
            <Check className="h-4 w-4" /> {t("id.imported")}
          </p>
          <p className="mt-2 text-sm">
            {saved.firstName} {saved.lastName} — {saved.docType === "CNI" ? t("id.cni") : t("id.pp")}{" "}
            {maskDoc(saved.docNumber)}
          </p>
          <button type="button" onClick={onReplace} className="mt-3 text-sm underline">
            {t("id.replace")}
          </button>
        </div>
      )}

      {(slot.phase === "idle" || slot.phase === "reading") && (
        <label className="btn-gold mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm">
          {slot.phase === "reading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="h-4 w-4" />
          )}
          {slot.phase === "reading" ? t("id.reading") : t("id.upload")}
          <input
            type="file"
            accept={ACCEPT}
            className="sr-only"
            disabled={slot.phase === "reading"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              onFile(file);
            }}
          />
        </label>
      )}

      {slot.error && <p className="mt-3 text-sm text-red-700">{errorText(t, slot.error)}</p>}

      {(slot.phase === "review" || slot.phase === "saving") && slot.fields && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onImport();
          }}
        >
          {slot.warnings.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {slot.warnings.map((code) => (
                <li key={code}>{t(`id.warn.${code}`)}</li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("id.sex")}>
              <select
                className="field"
                required
                value={slot.fields.sex}
                onChange={(e) => onChange({ ...slot.fields!, sex: e.target.value as IdentityFields["sex"] })}
              >
                <option value="">{t("id.choose")}</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </Field>
            <Field label={t("id.docType")}>
              <select
                className="field"
                required
                value={slot.fields.docType}
                onChange={(e) =>
                  onChange({ ...slot.fields!, docType: e.target.value as IdentityFields["docType"] })
                }
              >
                <option value="">{t("id.choose")}</option>
                <option value="PP">{t("id.pp")}</option>
                <option value="CNI">{t("id.cni")}</option>
              </select>
            </Field>
            <Field label={t("id.lastName")}>
              <input
                className="field"
                required
                maxLength={80}
                value={slot.fields.lastName}
                onChange={(e) => onChange({ ...slot.fields!, lastName: e.target.value })}
              />
            </Field>
            <Field label={t("id.firstName")}>
              <input
                className="field"
                required
                maxLength={80}
                value={slot.fields.firstName}
                onChange={(e) => onChange({ ...slot.fields!, firstName: e.target.value })}
              />
            </Field>
            <Field label={t("id.dob")}>
              <input
                className="field"
                type="date"
                required
                value={slot.fields.dateOfBirth}
                onChange={(e) => onChange({ ...slot.fields!, dateOfBirth: e.target.value })}
              />
            </Field>
            <Field label={t("id.place")}>
              <input
                className="field"
                maxLength={80}
                value={slot.fields.placeOfBirth}
                onChange={(e) => onChange({ ...slot.fields!, placeOfBirth: e.target.value })}
              />
            </Field>
            <Field label={t("id.docNumber")}>
              <input
                className="field"
                required
                maxLength={24}
                value={slot.fields.docNumber}
                onChange={(e) => onChange({ ...slot.fields!, docNumber: e.target.value })}
              />
            </Field>
            <Field label={t("id.nationality")}>
              <input
                className="field uppercase"
                required
                maxLength={3}
                minLength={3}
                value={slot.fields.nationality}
                onChange={(e) =>
                  onChange({ ...slot.fields!, nationality: e.target.value.toUpperCase() })
                }
              />
            </Field>
            <Field label={t("id.expiry")}>
              <input
                className="field"
                type="date"
                required
                value={slot.fields.expiryDate}
                onChange={(e) => onChange({ ...slot.fields!, expiryDate: e.target.value })}
              />
            </Field>
          </div>
          <Field label={t("id.specs")}>
            <input
              className="field"
              maxLength={200}
              value={slot.fields.specifications}
              placeholder={t("id.specsHint")}
              onChange={(e) => onChange({ ...slot.fields!, specifications: e.target.value })}
            />
          </Field>
          {slot.error && <p className="text-sm text-red-700">{errorText(t, slot.error)}</p>}
          <button
            type="submit"
            disabled={slot.phase === "saving"}
            className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm disabled:opacity-60"
          >
            {slot.phase === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("id.import")}
          </button>
        </form>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function errorText(t: (key: string) => string, code: string): string {
  const key = `id.error.${code}`;
  const text = t(key);
  return text === key ? t("id.error.generic") : text;
}

function maskDoc(value: string): string {
  const clean = value.replace(/\s/g, "");
  if (clean.length <= 4) return clean;
  return `···${clean.slice(-4)}`;
}

function formatIso(iso: string, locale: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
