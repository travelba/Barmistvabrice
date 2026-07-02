import { Resend } from "resend";
import { EVENT } from "./config";
import { agencyEmailHtml } from "./email-template";
import { formatEuro } from "./pricing";
import type { Booking, CeremonyRsvp, Locale } from "./types";

/**
 * Emails transactionnels — desormais reserves a la NOTIFICATION AGENCE.
 * Les confirmations destinees a l'invite partent par WhatsApp (voir whatsapp.ts).
 * L'agence conserve une notification e-mail a chaque inscription / RSVP.
 */

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

/**
 * Le SDK Resend ne LEVE PAS d'exception quand l'API refuse l'envoi. Il renvoie
 * { data, error }. On inspecte donc `error` et on lance une exception pour que
 * l'echec soit visible (logs / Promise.allSettled).
 */
async function deliver(
  resend: Resend,
  payload: Parameters<Resend["emails"]["send"]>[0],
): Promise<void> {
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    console.error("[email] echec envoi Resend", {
      to: payload.to,
      name: error.name,
      message: error.message,
    });
    throw new Error(`Resend: ${error.name} — ${error.message}`);
  }
  console.log("[email] envoye", { to: payload.to, id: data?.id });
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "Travel BA <onboarding@resend.dev>";
}

function agencyAddress(): string {
  return process.env.AGENCY_NOTIFY_EMAIL ?? EVENT.agencyEmail;
}

/* ------------------------------------------------------------------ */
/*  Notification AGENCE — reservation voyage confirmee (apres paiement) */
/* ------------------------------------------------------------------ */

export async function sendConfirmationAgencyEmail(
  b: Booking,
  _locale: Locale = "fr",
): Promise<void> {
  void _locale;
  const resend = getResend();
  if (!resend) {
    console.warn("[email] Resend non configuré — notif agence non envoyée pour", b.id);
    return;
  }
  await deliver(resend, {
    from: fromAddress(),
    to: agencyAddress(),
    subject: `Nouvelle inscription — ${b.groupName} (${formatEuro(b.totalCents)})`,
    html: agencyEmailHtml({
      title: "Nouvelle réservation confirmée",
      subtitle: `${b.groupName} · ${EVENT.destination}`,
      ref: b.id,
      rows: [
        { label: "Groupe", value: `<strong>${b.groupName}</strong>` },
        { label: "Contact", value: `${b.email}<br>${b.phone}` },
        { label: "Hôtel", value: b.hotelName },
        { label: "Passagers", value: String(b.passengerCount) },
        {
          label: "Cérémonie",
          value: `${b.ceremonyAttending ? "présent(s)" : "absent(s)"}${
            b.ceremonyGuestCount ? ` (+${b.ceremonyGuestCount} invité(s))` : ""
          }`,
        },
        { label: "Total", value: `<strong>${formatEuro(b.totalCents)}</strong>` },
      ],
    }),
  });
}

/* ------------------------------------------------------------------ */
/*  Notification AGENCE — RSVP mise des Tephilines                     */
/* ------------------------------------------------------------------ */

export async function sendRsvpAgencyEmail(
  r: CeremonyRsvp,
  _locale: Locale = "fr",
): Promise<void> {
  void _locale;
  const resend = getResend();
  if (!resend) {
    console.warn("[email] Resend non configuré — notif agence RSVP non envoyée pour", r.id);
    return;
  }
  await deliver(resend, {
    from: fromAddress(),
    to: agencyAddress(),
    subject: `RSVP Téphilines — ${r.name} (${r.attending ? "présent" : "absent"})`,
    html: agencyEmailHtml({
      title: "Nouvelle réponse — Téphilines",
      subtitle: EVENT.tephilinesPlace,
      ref: r.id,
      rows: [
        { label: "Invité", value: `<strong>${r.name}</strong>` },
        {
          label: "Contact",
          value: `${r.phone || "tél. non fourni"}${r.email ? `<br>${r.email}` : ""}`,
        },
        { label: "Réponse", value: r.attending ? "présent(e)" : "absent(e)" },
        { label: "Personnes", value: String(r.guestCount) },
      ],
    }),
  });
}
