"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { adminT, type AdminLang } from "@/lib/admin-i18n";

export function RsvpActions({ rsvpId, lang = "fr" }: { rsvpId: string; lang?: AdminLang }) {
  const router = useRouter();
  const t = adminT(lang);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm(t("actions.confirmDeleteRsvp"))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/rsvps/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvpId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("actions.error"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("actions.error"));
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={remove}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t("actions.delete")}
      </button>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
