import { Resend } from "resend";
import { EVENT, TRIP_NIGHTS } from "./config";
import { formatEuro } from "./pricing";
import { travelDocsBuffer } from "./pdf/travelDocs";
import type { Booking, CeremonyRsvp, Locale } from "./types";

/** Chaines de l'email de confirmation, par langue. */
const EMAIL_STRINGS: Record<Locale, Record<string, string>> = {
  fr: {
    kicker: "BAR MITSVAH",
    confirmed: "Votre réservation est confirmée",
    greeting: "Bonjour",
    intro: "Nous avons le plaisir de confirmer votre voyage pour la Bar Mitsvah de",
    ref: "Référence :",
    hotel: "Hôtel",
    nights: "nuits",
    flight: "Vol privé",
    passengers: "passager(s)",
    ceremonyTitle: "Mise des Téphilines",
    ceremonyYes: "Présence confirmée le {date} — {place}, {address}.",
    ceremonyNo: "Vous avez indiqué ne pas assister à la mise des Téphilines.",
    rooms: "Chambres",
    flights: "Billets d'avion",
    total: "Total réglé",
    subject: "Confirmation — Bar Mitsvah de",
  },
  he: {
    kicker: "בר מצווה",
    confirmed: "ההזמנה שלך אושרה",
    greeting: "שלום",
    intro: "אנו שמחים לאשר את נסיעתך לבר המצווה של",
    ref: "מספר אסמכתא:",
    hotel: "מלון",
    nights: "לילות",
    flight: "טיסה פרטית",
    passengers: "נוסעים",
    ceremonyTitle: "הנחת תפילין",
    ceremonyYes: "ההגעה אושרה לתאריך {date} — {place}, {address}.",
    ceremonyNo: "ציינת שלא תשתתף בהנחת התפילין.",
    rooms: "חדרים",
    flights: "כרטיסי טיסה",
    total: "סך הכול ששולם",
    subject: "אישור — בר מצווה של",
  },
};

function ceremonyDateLabel(locale: Locale): string {
  return new Date(EVENT.tephilinesDate).toLocaleDateString(
    locale === "he" ? "he-IL" : "fr-FR",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

/**
 * Le SDK Resend ne LEVE PAS d'exception quand l'API refuse l'envoi
 * (domaine non verifie, mode test limite a l'adresse du compte, destinataire
 * invalide…). Il renvoie { data, error }. On inspecte donc `error` et on lance
 * une exception pour que l'echec soit visible (logs / Promise.allSettled) au
 * lieu d'etre silencieusement ignore.
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

function bookingHtml(b: Booking, locale: Locale): string {
  const s = EMAIL_STRINGS[locale];
  const dir = locale === "he" ? "rtl" : "ltr";
  const amountAlign = locale === "he" ? "left" : "right";
  const rows = b.rooms
    .map(
      (r) =>
        `<tr><td style="padding:6px 0">${r.quantity}× ${r.roomName}<br/><span style="color:#888;font-size:12px">${formatEuro(
          r.priceCents,
        )} × ${TRIP_NIGHTS} ${s.nights}</span></td><td style="text-align:${amountAlign};vertical-align:top">${formatEuro(
          r.priceCents * r.quantity * TRIP_NIGHTS,
        )}</td></tr>`,
    )
    .join("");
  const pax = b.passengers
    .map((p) => `<li>${p.firstName} ${p.lastName} — ${p.dateOfBirth}</li>`)
    .join("");
  const ceremonyLine = b.ceremonyAttending
    ? s.ceremonyYes
        .replace("{date}", ceremonyDateLabel(locale))
        .replace("{place}", EVENT.tephilinesPlace)
        .replace("{address}", EVENT.tephilinesAddress)
    : s.ceremonyNo;
  return `
  <div dir="${dir}" style="font-family:Georgia,serif;max-width:600px;margin:auto;color:#1a2238;text-align:${dir === "rtl" ? "right" : "left"}">
    <div style="background:#0f2a43;color:#f6e7c1;padding:32px;text-align:center">
      <p style="letter-spacing:4px;margin:0;font-size:12px">${s.kicker}</p>
      <h1 style="margin:8px 0 0;font-size:28px">${EVENT.childName}</h1>
      <p style="margin:4px 0 0;color:#cdd8e8">${EVENT.destination}</p>
    </div>
    <div style="padding:28px">
      <h2 style="color:#0f2a43">${s.confirmed}</h2>
      <p>${s.greeting} ${b.groupName},</p>
      <p>${s.intro} ${EVENT.childName}.</p>
      <p><strong>${s.ref}</strong> ${b.id}</p>
      <h3 style="color:#0f2a43">${s.hotel} — ${b.hotelName}</h3>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <h3 style="color:#0f2a43">${s.flight} — ${b.passengerCount} ${s.passengers}</h3>
      <ul>${pax}</ul>
      <h3 style="color:#0f2a43">${s.ceremonyTitle}</h3>
      <p>${ceremonyLine}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;border-top:1px solid #ddd">
        <tr><td style="padding:6px 0">${s.rooms}</td><td style="text-align:${amountAlign}">${formatEuro(b.roomsTotalCents)}</td></tr>
        <tr><td style="padding:6px 0">${s.flights}</td><td style="text-align:${amountAlign}">${formatEuro(b.flightTotalCents)}</td></tr>
        <tr><td style="padding:10px 0;font-weight:bold;border-top:2px solid #0f2a43">${s.total}</td><td style="text-align:${amountAlign};font-weight:bold;border-top:2px solid #0f2a43">${formatEuro(b.totalCents)}</td></tr>
      </table>
      <p style="margin-top:24px;color:#666">${EVENT.agencyName}</p>
    </div>
  </div>`;
}

export async function sendConfirmationEmails(
  b: Booking,
  locale: Locale = "fr",
): Promise<void> {
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

  // Email de confirmation a l'invite, dans la langue utilisee lors de la reservation.
  // Notification a l'agence (independante : si l'un echoue, l'autre est tente).
  const agencyTo = process.env.AGENCY_NOTIFY_EMAIL ?? EVENT.agencyEmail;
  const results = await Promise.allSettled([
    deliver(resend, {
      from: fromAddress(),
      to: b.email,
      subject: `${EMAIL_STRINGS[locale].subject} ${EVENT.childName}`,
      html: bookingHtml(b, locale),
      attachments,
    }),
    deliver(resend, {
      from: fromAddress(),
      to: agencyTo,
      subject: `Nouvelle inscription — ${b.groupName} (${formatEuro(b.totalCents)})`,
      html: `<p>Nouvelle réservation confirmée.</p><p><strong>${b.groupName}</strong> — ${b.email} — ${b.phone}</p><p>Hôtel : ${b.hotelName}</p><p>Passagers : ${b.passengerCount}</p><p>Cérémonie : ${b.ceremonyAttending ? "présent(s)" : "absent(s)"}${b.ceremonyGuestCount ? ` (+${b.ceremonyGuestCount} invité(s))` : ""}</p><p>Total : ${formatEuro(b.totalCents)}</p><p>Réf : ${b.id}</p>`,
    }),
  ]);
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length) {
    throw new Error(
      `Envoi confirmation partiel/echoue (${failed.length}/2) pour ${b.id}`,
    );
  }
}

const RSVP_STRINGS: Record<Locale, Record<string, string>> = {
  fr: {
    kicker: "BAR MITSVAH",
    sub: "Mise des Téphilines",
    titleYes: "Merci, votre présence est confirmée",
    titleNo: "Merci pour votre réponse",
    greeting: "Bonjour",
    bodyYes: "Nous avons le plaisir de vous compter parmi nous pour la mise des Téphilines de",
    date: "Date :",
    place: "Lieu :",
    address: "Adresse :",
    people: "Nombre de personnes :",
    bodyNo: "Nous avons bien noté que vous ne pourrez pas être présent(e). Merci de nous avoir prévenus.",
    subject: "Mise des Téphilines —",
  },
  he: {
    kicker: "בר מצווה",
    sub: "הנחת תפילין",
    titleYes: "תודה, הגעתך אושרה",
    titleNo: "תודה על תשובתך",
    greeting: "שלום",
    bodyYes: "אנו שמחים למנות אותך עמנו בהנחת התפילין של",
    date: "תאריך:",
    place: "מקום:",
    address: "כתובת:",
    people: "מספר אנשים:",
    bodyNo: "רשמנו שלא תוכל להגיע. תודה שהודעת לנו.",
    subject: "הנחת תפילין —",
  },
};

function rsvpHtml(r: CeremonyRsvp, locale: Locale): string {
  const s = RSVP_STRINGS[locale];
  const dir = locale === "he" ? "rtl" : "ltr";
  return `
  <div dir="${dir}" style="font-family:Georgia,serif;max-width:600px;margin:auto;color:#1a2238;text-align:${dir === "rtl" ? "right" : "left"}">
    <div style="background:#0f2a43;color:#f6e7c1;padding:32px;text-align:center">
      <p style="letter-spacing:4px;margin:0;font-size:12px">${s.kicker}</p>
      <h1 style="margin:8px 0 0;font-size:28px">${EVENT.childName}</h1>
      <p style="margin:4px 0 0;color:#cdd8e8">${s.sub}</p>
    </div>
    <div style="padding:28px">
      <h2 style="color:#0f2a43">${r.attending ? s.titleYes : s.titleNo}</h2>
      <p>${s.greeting} ${r.name},</p>
      ${
        r.attending
          ? `<p>${s.bodyYes} ${EVENT.childName}.</p>
             <p><strong>${s.date}</strong> ${ceremonyDateLabel(locale)}<br/>
             <strong>${s.place}</strong> ${EVENT.tephilinesPlace}<br/>
             <strong>${s.address}</strong> ${EVENT.tephilinesAddress}<br/>
             <strong>${s.people}</strong> ${r.guestCount}</p>`
          : `<p>${s.bodyNo}</p>`
      }
      <p style="margin-top:24px;color:#666">${EVENT.agencyName}</p>
    </div>
  </div>`;
}

export async function sendRsvpEmails(r: CeremonyRsvp, locale: Locale = "fr"): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] Resend non configuré — RSVP non notifié pour", r.id);
    return;
  }

  const agencyTo = process.env.AGENCY_NOTIFY_EMAIL ?? EVENT.agencyEmail;
  await Promise.allSettled([
    deliver(resend, {
      from: fromAddress(),
      to: r.email,
      subject: `${RSVP_STRINGS[locale].subject} ${EVENT.childName}`,
      html: rsvpHtml(r, locale),
    }),
    deliver(resend, {
      from: fromAddress(),
      to: agencyTo,
      subject: `RSVP Téphilines — ${r.name} (${r.attending ? "présent" : "absent"})`,
      html: `<p>Nouvelle réponse à la mise des Téphilines.</p><p><strong>${r.name}</strong> — ${r.email} — ${r.phone}</p><p>Réponse : ${r.attending ? "présent(e)" : "absent(e)"}</p><p>Personnes : ${r.guestCount}</p>`,
    }),
  ]);
}
