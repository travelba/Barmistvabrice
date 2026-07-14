import { appUrl, EVENT, FLIGHT } from "./config";
import { bookingDocsPath } from "./doc-token";
import type { Booking, Locale } from "./types";

function ceremonyWhen(locale: Locale): string {
  const date = new Date(EVENT.tephilinesDate);
  const lang = locale === "he" ? "he-IL" : "fr-FR";
  const dateStr = date.toLocaleDateString(lang, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });
  const timeStr = date.toLocaleTimeString(lang, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
  if (locale === "he") {
    return `${dateStr}, ${timeStr}`;
  }
  return `${dateStr} à ${timeStr.replace(":", "h")}`;
}

function tripDates(locale: Locale): string {
  const start = new Date(`${EVENT.tripStartDate}T12:00:00`);
  const end = new Date(`${EVENT.tripEndDate}T12:00:00`);
  const lang = locale === "he" ? "he-IL" : "fr-FR";
  const fmt = (d: Date) =>
    d.toLocaleDateString(lang, { day: "numeric", month: "long", timeZone: "Europe/Paris" });
  if (locale === "he") {
    return `${fmt(start)} – ${fmt(end)}`;
  }
  return `${fmt(start)} au ${fmt(end)}`;
}

export interface ReminderProfile {
  name: string;
  locale: Locale;
  ceremonyAttending: boolean;
  hasPaidTrip: boolean;
  booking: Booking | null;
}

/** Bloc {{3}} — rappel J-7 global (option C). */
export function globalJ7Details(profile: ReminderProfile): string {
  const { locale, ceremonyAttending, hasPaidTrip, booking } = profile;
  const parts: string[] = [];

  if (ceremonyAttending) {
    if (locale === "he") {
      parts.push(
        `הנחת התפילין ב-${ceremonyWhen("he")} — ${EVENT.tephilinesPlace}, ${EVENT.tephilinesAddress}.`,
      );
    } else {
      parts.push(
        `Mise des Téphilines le ${ceremonyWhen("fr")} — ${EVENT.tephilinesPlace}, ${EVENT.tephilinesAddress}.`,
      );
    }
  }

  if (hasPaidTrip && booking) {
    const docsUrl = `${appUrl()}${bookingDocsPath(booking.id)}`;
    if (booking.flightTotalCents > 0) {
      if (locale === "he") {
        parts.push(
          `סוף השבוע במיקונוס (${tripDates("he")}). מלון: ${booking.hotelName}. טיסה פרטית מ-${FLIGHT.origin}, עלייה למטוס ${FLIGHT.outbound.boarding} (${FLIGHT.outbound.flightNo}). חוברת הנסיעה: ${docsUrl}`,
        );
      } else {
        parts.push(
          `Séjour à Mykonos (${tripDates("fr")}). Hôtel : ${booking.hotelName}. Départ ${FLIGHT.origin} — embarquement ${FLIGHT.outbound.boarding} (${FLIGHT.outbound.flightNo}). Carnet de voyage : ${docsUrl}`,
        );
      }
    } else if (locale === "he") {
      parts.push(
        `סוף השבוע במיקונוס (${tripDates("he")}). מלון: ${booking.hotelName}. חוברת הנסיעה: ${docsUrl}`,
      );
    } else {
      parts.push(
        `Séjour à Mykonos (${tripDates("fr")}). Hôtel : ${booking.hotelName}. Carnet de voyage : ${docsUrl}`,
      );
    }
  }

  return parts.join("\n\n");
}

/** Bloc {{3}} — rappel J-1 cérémonie. */
export function ceremonyJ1Details(locale: Locale): string {
  if (locale === "he") {
    return `מחר — ${ceremonyWhen("he")}.\n${EVENT.tephilinesPlace}\n${EVENT.tephilinesAddress}`;
  }
  return `Demain — ${ceremonyWhen("fr")}.\n${EVENT.tephilinesPlace}\n${EVENT.tephilinesAddress}`;
}

/** Blocs {{3}} et {{4}} — rappel J-1 départ (voyageurs payés). */
export function tripJ1Details(booking: Booking, locale: Locale): { details: string; docsUrl: string } {
  const docsUrl = `${appUrl()}${bookingDocsPath(booking.id)}`;
  if (booking.flightTotalCents > 0) {
    if (locale === "he") {
      return {
        details: `מחר — עלייה למטוס ${FLIGHT.outbound.boarding}, ${FLIGHT.origin} (${FLIGHT.outbound.flightNo} → ${FLIGHT.destination}). מלון: ${booking.hotelName}.`,
        docsUrl,
      };
    }
    return {
      details: `Demain — embarquement ${FLIGHT.outbound.boarding}, ${FLIGHT.origin} (${FLIGHT.outbound.flightNo} → ${FLIGHT.destination}). Hôtel : ${booking.hotelName}.`,
      docsUrl,
    };
  }
  if (locale === "he") {
    return {
      details: `מחר — הגעה למיקונוס. מלון: ${booking.hotelName}.`,
      docsUrl,
    };
  }
  return {
    details: `Demain — arrivée à Mykonos. Hôtel : ${booking.hotelName}.`,
    docsUrl,
  };
}
