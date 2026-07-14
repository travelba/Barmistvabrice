"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2, Copy, Check, X } from "lucide-react";
import { adminT, type AdminLang } from "@/lib/admin-i18n";

export function BookingActions({
  bookingId,
  status,
  lang = "fr",
}: {
  bookingId: string;
  status: string;
  lang?: AdminLang;
}) {
  const router = useRouter();
  const t = adminT(lang);
  const [loading, setLoading] = useState<null | "relaunch" | "cancel" | "delete">(null);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function relaunch() {
    setLoading("relaunch");
    setError(null);
    setWhatsappSent(null);
    try {
      const res = await fetch("/api/admin/bookings/relaunch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, locale: lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("actions.error"));
      setUrl(data.url as string);
      setWhatsappSent(Boolean(data.whatsappSent));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("actions.error"));
    } finally {
      setLoading(null);
    }
  }

  async function cancel() {
    if (!window.confirm(t("actions.confirmRelease"))) return;
    setLoading("cancel");
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("actions.error"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("actions.error"));
      setLoading(null);
    }
  }

  async function remove() {
    if (!window.confirm(t("actions.confirmDeleteBooking"))) return;
    setLoading("delete");
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("actions.error"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("actions.error"));
      setLoading(null);
    }
  }

  async function copyUrl() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponible : l'URL reste affichée pour copie manuelle */
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center justify-end gap-2">
        {status === "pending" && (
          <>
            <button
              type="button"
              onClick={relaunch}
              disabled={loading !== null}
              className="inline-flex items-center gap-1 rounded-full border border-gold bg-gold/10 px-3 py-1.5 text-xs font-medium text-navy transition hover:bg-gold disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading === "relaunch" ? "animate-spin" : ""}`} />
              {t("actions.relaunch")}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={loading !== null}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" />
              {t("actions.release")}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={loading !== null}
          className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("actions.delete")}
        </button>
      </div>

      {url && (
        <div className="flex w-full max-w-xs flex-col gap-1">
          <div className="flex items-center gap-1 rounded-lg border border-navy/15 bg-white px-2 py-1">
            <input
              readOnly
              value={url}
              className="min-w-0 flex-1 bg-transparent text-[11px] text-navy outline-none"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              onClick={copyUrl}
              className="shrink-0 rounded-md p-1 text-navy transition hover:bg-navy/10"
              aria-label={t("actions.copy")}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          {whatsappSent === true && (
            <p className="text-[11px] text-green-600">{t("actions.whatsappSent")}</p>
          )}
          {whatsappSent === false && (
            <p className="text-[11px] text-amber-700">{t("actions.whatsappSkipped")}</p>
          )}
        </div>
      )}

      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
