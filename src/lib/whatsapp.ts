import { appUrl, EVENT } from "./config";
import { bookingDocsFileName, bookingDocsPath } from "./doc-token";
import { defaultCountryForLocale, normalizePhoneE164 } from "./phone";
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
 * Normalise un numero saisi librement en format WhatsApp (whatsapp:+...).
 * La normalisation E.164 est partagee avec les formulaires (src/lib/phone.ts) ;
 * `defaultCountry` gere le prefixe national par defaut (33 = France, 972 = Israel).
 */
export function toWhatsappAddress(raw: string, defaultCountry = "33"): string | null {
  const e164 = normalizePhoneE164(raw, defaultCountry);
  return e164 ? `whatsapp:${e164}` : null;
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
  const to = toWhatsappAddress(b.phone, defaultCountryForLocale(locale));
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

  // Second message : le carnet de voyage PDF en piece jointe, via un template
  // "media" dont l'URL est ancree au domaine — {{1}} ne contient que le nom
  // de fichier (exigence Meta : URL non entierement variable, extension .pdf).
  //   Media URL du template : https://<domaine>/api/documents/{{1}}
  // Optionnel (best effort) : si le template n'est pas configure ou que
  // l'envoi echoue, la confirmation ci-dessus reste suffisante.
  const docsSid =
    locale === "he"
      ? process.env.TWILIO_WA_TEMPLATE_BOOKING_DOCS_HE
      : process.env.TWILIO_WA_TEMPLATE_BOOKING_DOCS_FR;
  if (docsSid) {
    try {
      await sendTemplate({
        to,
        contentSid: docsSid,
        variables: { "1": bookingDocsFileName(b.id) },
      });
    } catch (e) {
      console.error("[whatsapp] echec envoi carnet PDF pour", b.id, e);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Relance PAIEMENT (admin) — lien Stripe Checkout a l'invite         */
/* ------------------------------------------------------------------ */

export async function sendPaymentRelaunchWhatsapp(
  b: Booking,
  paymentUrl: string,
  locale: Locale = "fr",
): Promise<boolean> {
  if (!isWhatsappConfigured()) {
    console.warn("[whatsapp] Twilio non configuré — relance paiement non envoyée pour", b.id);
    return false;
  }
  const to = toWhatsappAddress(b.phone, defaultCountryForLocale(locale));
  if (!to) {
    console.warn("[whatsapp] téléphone invalide pour relance", b.id, "-", b.phone);
    return false;
  }
  const contentSid =
    locale === "he"
      ? process.env.TWILIO_WA_TEMPLATE_BOOKING_RELAUNCH_HE
      : process.env.TWILIO_WA_TEMPLATE_BOOKING_RELAUNCH_FR;
  if (!contentSid) {
    console.warn("[whatsapp] template BOOKING_RELAUNCH manquant pour la langue", locale);
    return false;
  }
  await sendTemplate({
    to,
    contentSid,
    // {{1}} nom, {{2}} hôtel, {{3}} total, {{4}} lien paiement Stripe
    variables: {
      "1": b.groupName,
      "2": b.hotelName,
      "3": formatEuro(b.totalCents),
      "4": paymentUrl,
    },
  });
  return true;
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
  const to = toWhatsappAddress(r.phone, defaultCountryForLocale(locale));
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
