import { appUrl, EVENT } from "./config";
import { bookingDocsPath } from "./doc-token";
import { formatEuro } from "./pricing";
import type { Booking, CeremonyRsvp, Locale } from "./types";

/**
 * Envoi des confirmations par WhatsApp Business via Twilio (Content API).
 *
 * Un message a l'initiative de l'entreprise (confirmation) DOIT utiliser un
 * modele ("template") pre-approuve par Meta. On reference donc des Content SID
 * Twilio (un par type de message et par langue) fournis via variables d'env,
 * et on ne fait que passer les variables dynamiques.
 *
 * Si Twilio n'est pas configure, les envois sont ignores (log) — l'inscription
 * reste valide, exactement comme le comportement "Resend non configure".
 */

const API_BASE = "https://api.twilio.com/2010-04-01";

export function isWhatsappConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM,
  );
}

/**
 * Normalise un numero saisi librement en format WhatsApp E.164 (whatsapp:+...).
 * - conserve un numero deja international (+33..., 0033...)
 * - convertit un numero national FR (06..., 07...) en +33
 * `defaultCountry` gere le prefixe par defaut (France ici).
 */
export function toWhatsappAddress(raw: string, defaultCountry = "33"): string | null {
  if (!raw) return null;
  let n = raw.trim().replace(/[\s().-]/g, "");
  if (n.startsWith("+")) {
    n = "+" + n.slice(1).replace(/\D/g, "");
  } else if (n.startsWith("00")) {
    n = "+" + n.slice(2).replace(/\D/g, "");
  } else {
    const digits = n.replace(/\D/g, "");
    if (digits.startsWith("0")) n = `+${defaultCountry}${digits.slice(1)}`;
    else if (digits.length >= 8) n = `+${digits}`;
    else return null;
  }
  // E.164 : + suivi de 8 a 15 chiffres.
  if (!/^\+\d{8,15}$/.test(n)) return null;
  return `whatsapp:${n}`;
}

function ceremonyDateLabel(locale: Locale): string {
  const date = new Date(EVENT.tephilinesDate);
  const lang = locale === "he" ? "he-IL" : "fr-FR";
  // timeZone explicite : les serveurs Vercel tournent en UTC, sans elle
  // l'heure affichee serait decalee (07:00 au lieu de 09:00).
  const dateStr = date.toLocaleDateString(lang, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
  const timeStr = date.toLocaleTimeString(lang, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
  return locale === "he"
    ? `${dateStr}, ${timeStr}`
    : `${dateStr} à ${timeStr.replace(":", "h")}`;
}

async function sendTemplate(opts: {
  to: string;
  contentSid: string;
  variables?: Record<string, string>;
}): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_FROM!; // ex: "whatsapp:+14155238886"

  const body = new URLSearchParams();
  body.set("To", opts.to);
  body.set("From", from.startsWith("whatsapp:") ? from : `whatsapp:${from}`);
  body.set("ContentSid", opts.contentSid);
  if (opts.variables && Object.keys(opts.variables).length > 0) {
    body.set("ContentVariables", JSON.stringify(opts.variables));
  }

  const res = await fetch(`${API_BASE}/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[whatsapp] echec envoi Twilio", { to: opts.to, status: res.status, detail });
    throw new Error(`Twilio WhatsApp ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await res.json().catch(() => null)) as { sid?: string } | null;
  console.log("[whatsapp] envoye", { to: opts.to, sid: data?.sid });
}

/* ------------------------------------------------------------------ */
/*  Confirmation VOYAGE (apres paiement) — envoyee a l'invite          */
/* ------------------------------------------------------------------ */

export async function sendConfirmationWhatsapp(
  b: Booking,
  locale: Locale = "fr",
): Promise<void> {
  if (!isWhatsappConfigured()) {
    console.warn("[whatsapp] Twilio non configuré — confirmation voyage non envoyée pour", b.id);
    return;
  }
  const to = toWhatsappAddress(b.phone);
  if (!to) {
    console.warn("[whatsapp] téléphone invalide pour", b.id, "-", b.phone);
    return;
  }
  const contentSid =
    locale === "he"
      ? process.env.TWILIO_WA_TEMPLATE_BOOKING_CONFIRMATION_HE
      : process.env.TWILIO_WA_TEMPLATE_BOOKING_CONFIRMATION_FR;
  if (!contentSid) {
    console.warn("[whatsapp] template BOOKING manquant pour la langue", locale);
    return;
  }
  const docsUrl = `${appUrl()}${bookingDocsPath(b.id)}`;
  await sendTemplate({
    to,
    contentSid,
    // Doit correspondre a l'ordre des variables {{1}}..{{6}} du template approuve.
    variables: {
      "1": b.groupName,
      "2": EVENT.childName,
      "3": b.id,
      "4": b.hotelName,
      "5": formatEuro(b.totalCents),
      "6": docsUrl,
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Confirmation RSVP TEPHILINES — envoyee a l'invite                  */
/* ------------------------------------------------------------------ */

export async function sendRsvpWhatsapp(
  r: CeremonyRsvp,
  locale: Locale = "fr",
): Promise<void> {
  if (!isWhatsappConfigured()) {
    console.warn("[whatsapp] Twilio non configuré — RSVP non notifié pour", r.id);
    return;
  }
  const to = toWhatsappAddress(r.phone);
  if (!to) {
    console.warn("[whatsapp] téléphone invalide pour RSVP", r.id, "-", r.phone);
    return;
  }

  if (r.attending) {
    const contentSid =
      locale === "he"
        ? process.env.TWILIO_WA_TEMPLATE_RSVP_YES_HE
        : process.env.TWILIO_WA_TEMPLATE_RSVP_YES_FR;
    if (!contentSid) {
      console.warn("[whatsapp] template RSVP_YES manquant pour la langue", locale);
      return;
    }
    await sendTemplate({
      to,
      contentSid,
      // {{1}}..{{6}} : nom, enfant, date, lieu, adresse, nb personnes
      variables: {
        "1": r.name,
        "2": EVENT.childName,
        "3": ceremonyDateLabel(locale),
        "4": EVENT.tephilinesPlace,
        "5": EVENT.tephilinesAddress,
        "6": String(r.guestCount),
      },
    });
  } else {
    const contentSid =
      locale === "he"
        ? process.env.TWILIO_WA_TEMPLATE_RSVP_NO_HE
        : process.env.TWILIO_WA_TEMPLATE_RSVP_NO_FR;
    if (!contentSid) {
      console.warn("[whatsapp] template RSVP_NO manquant pour la langue", locale);
      return;
    }
    await sendTemplate({
      to,
      contentSid,
      // {{1}}, {{2}} : nom, enfant
      variables: { "1": r.name, "2": EVENT.childName },
    });
  }
}
