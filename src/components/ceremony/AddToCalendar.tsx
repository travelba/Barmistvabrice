"use client";

import { CalendarPlus } from "lucide-react";
import { EVENT } from "@/lib/config";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * Genere et telecharge un fichier .ics universel (Apple, Google, Outlook…).
 * La mise des Tephilines : 8 oct. 2026 a 9h00 (Europe/Paris, CEST = UTC+2).
 */
function buildIcs(): string {
  // 09:00 Paris (CEST) -> 07:00 UTC ; fin estimee a 12:00 Paris -> 10:00 UTC (office + brunch).
  const dtStart = "20261008T070000Z";
  const dtEnd = "20261008T100000Z";
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Travel BA//Bar Mitsvah Shon Bechet//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:tephilines-shon-bechet@travelba`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Mise des Téphilines — ${EVENT.childName}`,
    `LOCATION:${EVENT.tephilinesPlace}, ${EVENT.tephilinesAddress}`,
    "DESCRIPTION:Mise des Téphilines à 9h précises. Un brunch suivra l'office.",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function AddToCalendar() {
  const { t } = useI18n();
  function download() {
    const blob = new Blob([buildIcs()], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tephilines-shon-bechet.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="btn-outline inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm"
    >
      <CalendarPlus className="h-4 w-4" /> {t("ceremony.addToCalendar")}
    </button>
  );
}
