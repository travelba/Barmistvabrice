import { google } from "googleapis";
import { formatEuro } from "./pricing";
import type { Booking, CeremonyRsvp } from "./types";

function sheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!email || !rawKey || !sheetId) return null;
  const auth = new google.auth.JWT({
    email,
    key: rawKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return { sheets: google.sheets({ version: "v4", auth }), sheetId };
}

/**
 * Ajoute une ligne au Google Sheet de listing a chaque paiement reussi.
 * Configuration requise :
 *  - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *  - GOOGLE_PRIVATE_KEY (avec \n echappes)
 *  - GOOGLE_SHEET_ID (id du classeur partage avec le compte de service)
 * Si non configure, la fonction ne fait rien (no-op) et journalise.
 */
export async function appendBookingToSheet(booking: Booking): Promise<void> {
  const client = sheetsClient();
  if (!client) {
    console.warn("[sheets] Google Sheets non configuré — ligne non ajoutée pour", booking.id);
    return;
  }
  const { sheets, sheetId } = client;

  const roomsLabel = booking.rooms
    .map((r) => `${r.quantity}× ${r.roomName}`)
    .join(" | ");
  const passengersLabel = booking.passengers
    .map((p) => `${p.firstName} ${p.lastName} (${p.dateOfBirth})`)
    .join(" | ");

  const row = [
    new Date(booking.paidAt ?? booking.createdAt).toLocaleString("fr-FR"),
    booking.id,
    booking.status,
    booking.groupName,
    booking.email,
    booking.phone,
    booking.hotelName,
    roomsLabel,
    String(booking.passengerCount),
    passengersLabel,
    formatEuro(booking.roomsTotalCents),
    formatEuro(booking.flightTotalCents),
    formatEuro(booking.totalCents),
    booking.ceremonyAttending ? "Oui" : "Non",
    String(booking.ceremonyGuestCount),
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Inscriptions!A1",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

/**
 * Ajoute une ligne a l'onglet "Tephilines" pour chaque RSVP a la ceremonie.
 */
export async function appendRsvpToSheet(rsvp: CeremonyRsvp): Promise<void> {
  const client = sheetsClient();
  if (!client) {
    console.warn("[sheets] Google Sheets non configuré — RSVP non ajouté pour", rsvp.id);
    return;
  }
  const { sheets, sheetId } = client;

  const row = [
    new Date(rsvp.createdAt).toLocaleString("fr-FR"),
    rsvp.id,
    rsvp.name,
    rsvp.email,
    rsvp.phone,
    rsvp.attending ? "Présent" : "Absent",
    String(rsvp.guestCount),
    rsvp.source,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Tephilines!A1",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}
