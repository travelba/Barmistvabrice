"use client";

import { useState, type ReactNode } from "react";
import { Check, FileUp, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { IDENTITY_MAX_BYTES, type IdentityFields } from "@/lib/identity-manifest";

type Phase = "idle" | "reading" | "review" | "saving" | "done";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.heic,.heif,.pdf";

type DonePerson = { id: string; label: string };

export function AgenceDesk() {
  const { t, dir, toggleLocale } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [fields, setFields] = useState<IdentityFields | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<DonePerson[]>([]);

  function reset() {
    setPhase("idle");
    setFields(null);
    setWarnings([]);
    setFile(null);
    setError(null);
  }

  async function onFile(next: File | undefined) {
    if (!next) return;
    if (next.size > IDENTITY_MAX_BYTES) {
      setError("file_size");
      setPhase("idle");
      setFile(null);
      return;
    }
    setPhase("reading");
    setFile(next);
    setError(null);
    setWarnings([]);
    const body = new FormData();
    body.set("file", next);
    try {
      const res = await fetch("/api/identity/extract", { method: "POST", body });
      const data = (await res.json()) as { error?: string; fields?: IdentityFields; warnings?: string[] };
      if (!res.ok || !data.fields) {
        setPhase("idle");
        setError(data.error ?? "generic");
        return;
      }
      setFields({ ...data.fields, specifications: data.fields.specifications ?? "" });
      setWarnings(data.warnings ?? []);
      setPhase("review");
    } catch {
      setPhase("idle");
      setError("generic");
    }
  }

  async function onImport() {
    if (!file || !fields) return;
    setPhase("saving");
    setError(null);
    const body = new FormData();
    body.set("file", file);
    body.set("payload", JSON.stringify(fields));
    try {
      const res = await fetch("/api/identity/import", { method: "POST", body });
      const data = (await res.json()) as {
        error?: string;
        document?: { id: string; firstName: string; lastName: string };
      };
      if (!res.ok || !data.document) {
        setPhase("review");
        setError(data.error ?? "generic");
        return;
      }
      const label = `${data.document.firstName} ${data.document.lastName}`.trim();
      setDone((prev) => [{ id: data.document!.id, label }, ...prev]);
      setPhase("done");
      setFile(null);
    } catch {
      setPhase("review");
      setError("generic");
    }
  }

  return (
    <main className="theme-taupe min-h-screen bg-[var(--paper-base)] px-5 py-12 text-[var(--text)]" dir={dir}>
      <div className="mx-auto w-full max-w-xl">
        <div className="flex items-start justify-between gap-4">
          <p className="kicker text-[var(--accent-deep)]">Espace agence</p>
          <button
            type="button"
            onClick={toggleLocale}
            className="shrink-0 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm"
          >
            {t("nav.lang")}
          </button>
        </div>
        <h1 className="mt-4 font-serif text-4xl">{t("id.title")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)]">{t("id.agenceSubtitle")}</p>

        <section className="card mt-8 rounded-2xl p-5">
          {(phase === "idle" || phase === "reading") && (
            <label className="btn-gold inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm">
              {phase === "reading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {phase === "reading" ? t("id.reading") : t("id.upload")}
              <input
                type="file"
                accept={ACCEPT}
                className="sr-only"
                disabled={phase === "reading"}
                onChange={(e) => {
                  const chosen = e.target.files?.[0];
                  e.target.value = "";
                  void onFile(chosen);
                }}
              />
            </label>
          )}

          {error && phase !== "review" && phase !== "saving" && (
            <p className="mt-3 text-sm text-red-700">{errorText(t, error)}</p>
          )}

          {(phase === "review" || phase === "saving") && fields && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void onImport();
              }}
            >
              {warnings.length > 0 && (
                <ul className="space-y-1 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {warnings.map((code) => (
                    <li key={code}>{t(`id.warn.${code}`)}</li>
                  ))}
                </ul>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("id.sex")}>
                  <select
                    className="field"
                    required
                    value={fields.sex}
                    onChange={(e) => setFields({ ...fields, sex: e.target.value as IdentityFields["sex"] })}
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
                    value={fields.docType}
                    onChange={(e) => setFields({ ...fields, docType: e.target.value as IdentityFields["docType"] })}
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
                    value={fields.lastName}
                    onChange={(e) => setFields({ ...fields, lastName: e.target.value })}
                  />
                </Field>
                <Field label={t("id.firstName")}>
                  <input
                    className="field"
                    required
                    maxLength={80}
                    value={fields.firstName}
                    onChange={(e) => setFields({ ...fields, firstName: e.target.value })}
                  />
                </Field>
                <Field label={t("id.dob")}>
                  <input
                    className="field"
                    type="date"
                    required
                    value={fields.dateOfBirth}
                    onChange={(e) => setFields({ ...fields, dateOfBirth: e.target.value })}
                  />
                </Field>
                <Field label={t("id.place")}>
                  <input
                    className="field"
                    maxLength={80}
                    value={fields.placeOfBirth}
                    onChange={(e) => setFields({ ...fields, placeOfBirth: e.target.value })}
                  />
                </Field>
                <Field label={t("id.docNumber")}>
                  <input
                    className="field"
                    required
                    maxLength={24}
                    value={fields.docNumber}
                    onChange={(e) => setFields({ ...fields, docNumber: e.target.value })}
                  />
                </Field>
                <Field label={t("id.nationality")}>
                  <input
                    className="field uppercase"
                    required
                    maxLength={3}
                    minLength={3}
                    value={fields.nationality}
                    onChange={(e) => setFields({ ...fields, nationality: e.target.value.toUpperCase() })}
                  />
                </Field>
                <Field label={t("id.expiry")}>
                  <input
                    className="field"
                    type="date"
                    required
                    value={fields.expiryDate}
                    onChange={(e) => setFields({ ...fields, expiryDate: e.target.value })}
                  />
                </Field>
              </div>
              <Field label={t("id.specs")}>
                <input
                  className="field"
                  maxLength={200}
                  value={fields.specifications}
                  placeholder={t("id.specsHint")}
                  onChange={(e) => setFields({ ...fields, specifications: e.target.value })}
                />
              </Field>
              {error && <p className="text-sm text-red-700">{errorText(t, error)}</p>}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={phase === "saving"}
                  className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm disabled:opacity-60"
                >
                  {phase === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("id.import")}
                </button>
                <button type="button" onClick={reset} className="text-sm underline" disabled={phase === "saving"}>
                  {t("id.replace")}
                </button>
              </div>
            </form>
          )}

          {phase === "done" && (
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-deep)]">
                <Check className="h-4 w-4" /> {t("id.imported")}
              </p>
              <button type="button" onClick={reset} className="btn-gold mt-4 inline-flex rounded-full px-5 py-2.5 text-sm">
                {t("id.nextDocument")}
              </button>
            </div>
          )}
        </section>

        {done.length > 0 && (
          <ul className="mt-6 space-y-2 text-sm">
            {done.map((person) => (
              <li key={person.id} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[var(--accent-deep)]" />
                {person.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
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
