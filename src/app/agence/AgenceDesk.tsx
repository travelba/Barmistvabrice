"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, FileUp, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { IDENTITY_MAX_BYTES, type IdentityFields } from "@/lib/identity-manifest";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.heic,.heif,.pdf";

type ItemStatus = "queued" | "reading" | "review" | "saving" | "done" | "error";

type Item = {
  id: string;
  file: File;
  status: ItemStatus;
  fields: IdentityFields | null;
  warnings: string[];
  error: string | null;
};

export function AgenceDesk() {
  const { t, dir, toggleLocale } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [tick, setTick] = useState(0);
  const itemsRef = useRef<Item[]>([]);
  const busy = useRef(false);
  const dropped = useRef(new Set<string>());
  itemsRef.current = items;

  const patch = useCallback((id: string, partial: Partial<Item>) => {
    const next = itemsRef.current.map((item) => (item.id === id ? { ...item, ...partial } : item));
    itemsRef.current = next;
    setItems(next);
  }, []);

  useEffect(() => {
    if (busy.current) return;
    const next = itemsRef.current.find((item) => item.status === "queued");
    if (!next) return;
    busy.current = true;
    const id = next.id;
    const file = next.file;
    patch(id, { status: "reading", error: null });

    void (async () => {
      try {
        const body = new FormData();
        body.set("file", file);
        const res = await fetch("/api/identity/extract", { method: "POST", body });
        const data = (await res.json()) as { error?: string; fields?: IdentityFields; warnings?: string[] };
        if (dropped.current.has(id)) return;
        if (!res.ok || !data.fields) {
          patch(id, { status: "error", error: data.error ?? "generic" });
          return;
        }
        patch(id, {
          status: "review",
          fields: { ...data.fields, specifications: data.fields.specifications ?? "" },
          warnings: data.warnings ?? [],
          error: null,
        });
      } catch {
        if (!dropped.current.has(id)) patch(id, { status: "error", error: "generic" });
      } finally {
        busy.current = false;
        setTick((n) => n + 1);
      }
    })();
  }, [items, tick, patch]);

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const added: Item[] = [];
    for (const file of list) {
      const tooBig = file.size > IDENTITY_MAX_BYTES;
      added.push({
        id: crypto.randomUUID(),
        file,
        status: tooBig ? "error" : "queued",
        fields: null,
        warnings: [],
        error: tooBig ? "file_size" : null,
      });
    }
    const next = [...itemsRef.current, ...added];
    itemsRef.current = next;
    setItems(next);
  }

  function drop(id: string) {
    dropped.current.add(id);
    const next = itemsRef.current.filter((item) => item.id !== id);
    itemsRef.current = next;
    setItems(next);
  }

  async function importOne(id: string): Promise<boolean> {
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item?.fields || item.status === "saving" || item.status === "done") return false;
    if (!readyToImport(item.fields)) {
      patch(id, { error: "invalid" });
      return false;
    }
    patch(id, { status: "saving", error: null });
    const body = new FormData();
    body.set("file", item.file);
    body.set("payload", JSON.stringify(item.fields));
    try {
      const res = await fetch("/api/identity/import", { method: "POST", body });
      const data = (await res.json()) as {
        error?: string;
        document?: { id: string; firstName: string; lastName: string };
      };
      if (!res.ok || !data.document) {
        patch(id, { status: "review", error: data.error ?? "generic" });
        return false;
      }
      patch(id, { status: "done", error: null });
      return true;
    } catch {
      patch(id, { status: "review", error: "generic" });
      return false;
    }
  }

  async function importAll() {
    const ids = itemsRef.current.filter((item) => item.status === "review").map((item) => item.id);
    for (const id of ids) {
      const ok = await importOne(id);
      if (!ok) break;
    }
  }

  const pending = items.filter((item) => item.status === "queued" || item.status === "reading").length;
  const reviewCount = items.filter((item) => item.status === "review").length;
  const saving = items.some((item) => item.status === "saving");

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
          <label className="btn-gold inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm">
            <FileUp className="h-4 w-4" />
            {t("id.upload")}
            <input
              type="file"
              accept={ACCEPT}
              multiple
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {pending > 0 && (
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--text-soft)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("id.readingLeft").replace("{n}", String(pending))}
            </p>
          )}

          {reviewCount > 1 && (
            <button
              type="button"
              onClick={() => void importAll()}
              disabled={saving}
              className="btn-gold mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("id.importAll")}
            </button>
          )}

          <ul className="mt-5 space-y-4">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-[var(--line)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-sm font-medium">{item.file.name}</p>
                  {item.status !== "reading" && item.status !== "saving" && item.status !== "done" && (
                    <button type="button" onClick={() => drop(item.id)} className="shrink-0 text-sm underline">
                      {t("id.remove")}
                    </button>
                  )}
                </div>

                {item.status === "queued" && <p className="mt-2 text-sm text-[var(--text-soft)]">{t("id.waiting")}</p>}
                {item.status === "reading" && (
                  <p className="mt-2 inline-flex items-center gap-2 text-sm text-[var(--text-soft)]">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("id.reading")}
                  </p>
                )}
                {item.status === "error" && item.error && (
                  <p className="mt-2 text-sm text-red-700">{errorText(t, item.error)}</p>
                )}
                {item.status === "done" && (
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-deep)]">
                    <Check className="h-4 w-4" /> {t("id.imported")}
                  </p>
                )}

                {(item.status === "review" || item.status === "saving") && item.fields && (
                  <DocumentForm
                    fields={item.fields}
                    warnings={item.warnings}
                    error={item.error}
                    saving={item.status === "saving"}
                    onChange={(fields) => patch(item.id, { fields })}
                    onImport={() => void importOne(item.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

function readyToImport(fields: IdentityFields): boolean {
  return Boolean(
    fields.sex &&
      fields.docType &&
      fields.lastName.trim() &&
      fields.firstName.trim() &&
      fields.dateOfBirth &&
      fields.docNumber.trim() &&
      fields.nationality.trim().length === 3 &&
      fields.expiryDate,
  );
}

function DocumentForm({
  fields,
  warnings,
  error,
  saving,
  onChange,
  onImport,
}: {
  fields: IdentityFields;
  warnings: string[];
  error: string | null;
  saving: boolean;
  onChange: (fields: IdentityFields) => void;
  onImport: () => void;
}) {
  const { t } = useI18n();
  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onImport();
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
            disabled={saving}
            onChange={(e) => onChange({ ...fields, sex: e.target.value as IdentityFields["sex"] })}
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
            disabled={saving}
            onChange={(e) => onChange({ ...fields, docType: e.target.value as IdentityFields["docType"] })}
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
            disabled={saving}
            value={fields.lastName}
            onChange={(e) => onChange({ ...fields, lastName: e.target.value })}
          />
        </Field>
        <Field label={t("id.firstName")}>
          <input
            className="field"
            required
            maxLength={80}
            disabled={saving}
            value={fields.firstName}
            onChange={(e) => onChange({ ...fields, firstName: e.target.value })}
          />
        </Field>
        <Field label={t("id.dob")}>
          <input
            className="field"
            type="date"
            required
            disabled={saving}
            value={fields.dateOfBirth}
            onChange={(e) => onChange({ ...fields, dateOfBirth: e.target.value })}
          />
        </Field>
        <Field label={t("id.place")}>
          <input
            className="field"
            maxLength={80}
            disabled={saving}
            value={fields.placeOfBirth}
            onChange={(e) => onChange({ ...fields, placeOfBirth: e.target.value })}
          />
        </Field>
        <Field label={t("id.docNumber")}>
          <input
            className="field"
            required
            maxLength={24}
            disabled={saving}
            value={fields.docNumber}
            onChange={(e) => onChange({ ...fields, docNumber: e.target.value })}
          />
        </Field>
        <Field label={t("id.nationality")}>
          <input
            className="field uppercase"
            required
            maxLength={3}
            minLength={3}
            disabled={saving}
            value={fields.nationality}
            onChange={(e) => onChange({ ...fields, nationality: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label={t("id.expiry")}>
          <input
            className="field"
            type="date"
            required
            disabled={saving}
            value={fields.expiryDate}
            onChange={(e) => onChange({ ...fields, expiryDate: e.target.value })}
          />
        </Field>
      </div>
      <Field label={t("id.specs")}>
        <input
          className="field"
          maxLength={200}
          disabled={saving}
          value={fields.specifications}
          placeholder={t("id.specsHint")}
          onChange={(e) => onChange({ ...fields, specifications: e.target.value })}
        />
      </Field>
      {error && <p className="text-sm text-red-700">{errorText(t, error)}</p>}
      <button
        type="submit"
        disabled={saving}
        className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("id.import")}
      </button>
    </form>
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
