import { Resend } from "resend";
import { BRAND, EVENT } from "./config";
import { formatEuro } from "./pricing";
import type { Booking, CeremonyRsvp, Locale } from "./types";

/* ------------------------------------------------------------------ */
/*  Gabarit HTML aux couleurs de l'evenement (charte taupe & or)       */
/* ------------------------------------------------------------------ */

/**
 * Enveloppe un contenu HTML dans un gabarit e-mail reprenant le code couleur
 * de l'evenement (BRAND) : bandeau taupe/brun, papier creme, filets or.
 * Styles 100 % inline pour la compatibilite avec les clients de messagerie.
 */
function renderEmail(opts: {
  preTitle: string;
  title: string;
  bodyHtml: string;
}): string {
  const { preTitle, title, bodyHtml } = opts;
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:${BRAND.cream};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.cream};padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background-color:${BRAND.paper};border:1px solid ${BRAND.line};border-radius:14px;overflow:hidden;font-family:Georgia,'Times New Roman',serif;">
        <tr>
          <td style="background-color:${BRAND.taupeDeep};padding:26px 32px;text-align:center;">
            <div style="color:${BRAND.goldLight};font-size:11px;letter-spacing:3px;text-transform:uppercase;">${preTitle}</div>
            <div style="color:${BRAND.bandText};font-size:24px;margin-top:8px;">${title}</div>
          </td>
        </tr>
        <tr><td style="height:3px;background:linear-gradient(to right,${BRAND.taupe},${BRAND.gold},${BRAND.taupe});"></td></tr>
        <tr>
          <td style="padding:28px 32px;color:${BRAND.ink};font-size:15px;line-height:1.6;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid ${BRAND.line};padding:18px 32px;text-align:center;color:${BRAND.muted};font-size:12px;">
            ${EVENT.agencyName}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Ligne "étiquette : valeur" aux couleurs de l'evenement. */
function row(label: string, value: string): string {
  return `<p style="margin:0 0 10px 0;">
    <span style="display:inline-block;min-width:120px;color:${BRAND.muted};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">${label}</span>
    <span style="color:${BRAND.ink};font-weight:bold;">${value}</span>
  </p>`;
}

/** Construit la notification AGENCE (reservation voyage) aux couleurs de l'evenement. */
export function buildAgencyBookingEmail(b: Booking): { subject: string; html: string } {
  return {
    subject: `Nouvelle inscription — ${b.groupName} (${formatEuro(b.totalCents)})`,
    html: renderEmail({
      preTitle: `Bar Mitsvah · ${EVENT.childName}`,
      title: "Nouvelle réservation confirmée",
      bodyHtml: `
        ${row("Groupe", b.groupName)}
        ${row("E-mail", b.email)}
        ${row("Téléphone", b.phone)}
        ${row("Hôtel", b.hotelName)}
        ${row("Passagers", String(b.passengerCount))}
        ${row(
          "Cérémonie",
          `${b.ceremonyAttending ? "présent(s)" : "absent(s)"}${
            b.ceremonyGuestCount ? ` (+${b.ceremonyGuestCount} invité(s))` : ""
          }`,
        )}
        ${row("Total", formatEuro(b.totalCents))}
        ${row("Réf", b.id)}`,
    }),
  };
}

/** Construit la notification AGENCE (RSVP Tephilines) aux couleurs de l'evenement. */
export function buildAgencyRsvpEmail(r: CeremonyRsvp): { subject: string; html: string } {
  return {
    subject: `RSVP Téphilines — ${r.name} (${r.attending ? "présent" : "absent"})`,
    html: renderEmail({
      preTitle: `Mise des Téphilines · ${EVENT.childName}`,
      title: "Nouvelle réponse RSVP",
      bodyHtml: `
        ${row("Nom", r.name)}
        ${row("Téléphone", r.phone || "non fourni")}
        ${r.email ? row("E-mail", r.email) : ""}
        ${row("Réponse", r.attending ? "présent(e)" : "absent(e)")}
        ${row("Personnes", String(r.guestCount))}`,
    }),
  };
}

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
    ...buildAgencyBookingEmail(b),
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
    ...buildAgencyRsvpEmail(r),
  });
}
