import { Resend } from "resend";
import { EVENT, TRIP_NIGHTS } from "./config";
import { formatEuro } from "./pricing";
import { travelDocsBuffer } from "./pdf/travelDocs";
import type { Booking, CeremonyRsvp } from "./types";

function ceremonyDateLabel(): string {
  return new Date(EVENT.tephilinesDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "Travel BA <onboarding@resend.dev>";
}

function bookingHtml(b: Booking): string {
  const rows = b.rooms
    .map(
      (r) =>
        `<tr><td style="padding:6px 0">${r.quantity}× ${r.roomName}<br/><span style="color:#888;font-size:12px">${formatEuro(
          r.priceCents,
        )} × ${TRIP_NIGHTS} nuits</span></td><td style="text-align:right;vertical-align:top">${formatEuro(
          r.priceCents * r.quantity * TRIP_NIGHTS,
        )}</td></tr>`,
    )
    .join("");
  const pax = b.passengers
    .map((p) => `<li>${p.firstName} ${p.lastName} — ${p.dateOfBirth}</li>`)
    .join("");
  return `
  <div style="font-family:Georgia,serif;max-width:600px;margin:auto;color:#1a2238">
    <div style="background:#0f2a43;color:#f6e7c1;padding:32px;text-align:center">
      <p style="letter-spacing:4px;margin:0;font-size:12px">BAR MITSVAH</p>
      <h1 style="margin:8px 0 0;font-size:28px">${EVENT.childName}</h1>
      <p style="margin:4px 0 0;color:#cdd8e8">${EVENT.destination}</p>
    </div>
    <div style="padding:28px">
      <h2 style="color:#0f2a43">Votre réservation est confirmée</h2>
      <p>Bonjour ${b.groupName},</p>
      <p>Nous avons le plaisir de confirmer votre voyage pour la Bar Mitsvah de ${EVENT.childName}.</p>
      <p><strong>Référence :</strong> ${b.id}</p>
      <h3 style="color:#0f2a43">Hôtel — ${b.hotelName}</h3>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <h3 style="color:#0f2a43">Vol privé — ${b.passengerCount} passager(s)</h3>
      <ul>${pax}</ul>
      <h3 style="color:#0f2a43">Mise des Téphilines</h3>
      <p>${
        b.ceremonyAttending
          ? `Présence confirmée le ${ceremonyDateLabel()} — ${EVENT.tephilinesPlace}, ${EVENT.tephilinesAddress}.`
          : "Vous avez indiqué ne pas assister à la mise des Téphilines."
      }</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;border-top:1px solid #ddd">
        <tr><td style="padding:6px 0">Chambres</td><td style="text-align:right">${formatEuro(b.roomsTotalCents)}</td></tr>
        <tr><td style="padding:6px 0">Billets d'avion</td><td style="text-align:right">${formatEuro(b.flightTotalCents)}</td></tr>
        <tr><td style="padding:10px 0;font-weight:bold;border-top:2px solid #0f2a43">Total réglé</td><td style="text-align:right;font-weight:bold;border-top:2px solid #0f2a43">${formatEuro(b.totalCents)}</td></tr>
      </table>
      <p style="margin-top:24px;color:#666">${EVENT.agencyName}</p>
    </div>
  </div>`;
}

export async function sendConfirmationEmails(b: Booking): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] Resend non configuré — emails non envoyés pour", b.id);
    return;
  }

  // Carnet de voyage PDF (billets d'avion + confirmation hotel) en piece jointe.
  let attachments: Array<{ filename: string; content: Buffer }> | undefined;
  try {
    const pdf = await travelDocsBuffer(b);
    attachments = [{ filename: `carnet-voyage-${b.id.slice(0, 8)}.pdf`, content: pdf }];
  } catch (e) {
    console.error("[email] génération PDF échouée pour", b.id, e);
  }

  // Email de confirmation a l'invite.
  await resend.emails.send({
    from: fromAddress(),
    to: b.email,
    subject: `Confirmation — Bar Mitsvah de ${EVENT.childName}`,
    html: bookingHtml(b),
    attachments,
  });

  // Notification a l'agence.
  const agencyTo = process.env.AGENCY_NOTIFY_EMAIL ?? EVENT.agencyEmail;
  await resend.emails.send({
    from: fromAddress(),
    to: agencyTo,
    subject: `Nouvelle inscription — ${b.groupName} (${formatEuro(b.totalCents)})`,
    html: `<p>Nouvelle réservation confirmée.</p><p><strong>${b.groupName}</strong> — ${b.email} — ${b.phone}</p><p>Hôtel : ${b.hotelName}</p><p>Passagers : ${b.passengerCount}</p><p>Cérémonie : ${b.ceremonyAttending ? "présent(s)" : "absent(s)"}${b.ceremonyGuestCount ? ` (+${b.ceremonyGuestCount} invité(s))` : ""}</p><p>Total : ${formatEuro(b.totalCents)}</p><p>Réf : ${b.id}</p>`,
  });
}

function rsvpHtml(r: CeremonyRsvp): string {
  return `
  <div style="font-family:Georgia,serif;max-width:600px;margin:auto;color:#1a2238">
    <div style="background:#0f2a43;color:#f6e7c1;padding:32px;text-align:center">
      <p style="letter-spacing:4px;margin:0;font-size:12px">BAR MITSVAH</p>
      <h1 style="margin:8px 0 0;font-size:28px">${EVENT.childName}</h1>
      <p style="margin:4px 0 0;color:#cdd8e8">Mise des Téphilines</p>
    </div>
    <div style="padding:28px">
      <h2 style="color:#0f2a43">${r.attending ? "Merci, votre présence est confirmée" : "Merci pour votre réponse"}</h2>
      <p>Bonjour ${r.name},</p>
      ${
        r.attending
          ? `<p>Nous avons le plaisir de vous compter parmi nous pour la mise des Téphilines de ${EVENT.childName}.</p>
             <p><strong>Date :</strong> ${ceremonyDateLabel()}<br/>
             <strong>Lieu :</strong> ${EVENT.tephilinesPlace}<br/>
             <strong>Adresse :</strong> ${EVENT.tephilinesAddress}<br/>
             <strong>Nombre de personnes :</strong> ${r.guestCount}</p>`
          : `<p>Nous avons bien noté que vous ne pourrez pas être présent(e). Merci de nous avoir prévenus.</p>`
      }
      <p style="margin-top:24px;color:#666">${EVENT.agencyName}</p>
    </div>
  </div>`;
}

export async function sendRsvpEmails(r: CeremonyRsvp): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] Resend non configuré — RSVP non notifié pour", r.id);
    return;
  }

  await resend.emails.send({
    from: fromAddress(),
    to: r.email,
    subject: `Mise des Téphilines — ${EVENT.childName}`,
    html: rsvpHtml(r),
  });

  const agencyTo = process.env.AGENCY_NOTIFY_EMAIL ?? EVENT.agencyEmail;
  await resend.emails.send({
    from: fromAddress(),
    to: agencyTo,
    subject: `RSVP Téphilines — ${r.name} (${r.attending ? "présent" : "absent"})`,
    html: `<p>Nouvelle réponse à la mise des Téphilines.</p><p><strong>${r.name}</strong> — ${r.email} — ${r.phone}</p><p>Réponse : ${r.attending ? "présent(e)" : "absent(e)"}</p><p>Personnes : ${r.guestCount}</p>`,
  });
}
