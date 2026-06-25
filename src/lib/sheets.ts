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

/** Libelle francais du statut de paiement affiche dans le Sheet / export CSV. */
export const SHEET_STATUS_LABEL: Record<Booking["status"], string> = {
  pending: "En attente (non payé)",
  paid: "Payé",
  cancelled: "Annulée (place libérée)",
  expired: "Échec / expiré",
};

/**
 * Cree (ou met a jour) la ligne d'une reservation dans le Google Sheet.
 *
 * Une seule ligne par reservation, identifiee par son id (colonne B) :
 *  - a la creation, le paiement apparait "En attente (non payé)" ;
 *  - apres paiement, la meme ligne passe a "Payé" ;
 *  - apres annulation back-office, elle passe a "Annulée (place libérée)".
 *
 * Configuration requise :
 *  - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *  - GOOGLE_PRIVATE_KEY (avec \n echappes)
 *  - GOOGLE_SHEET_ID (id du classeur partage avec le compte de service)
 * Si non configure, la fonction ne fait rien (no-op) et journalise.
 */
export async function upsertBookingToSheet(booking: Booking): Promise<void> {
  const client = sheetsClient();
  if (!client) {
    console.warn("[sheets] Google Sheets non configuré — ligne non écrite pour", booking.id);
    return;
  }
  const { sheets, sheetId } = client;

  const roomsLabel = booking.rooms
    .map((r) => `${r.quantity}× ${r.roomName}`)
    .join(" | ");
  const passengersLabel = booking.passengers
    .map((p) => `${p.firstName} ${p.lastName} (${p.dateOfBirth})`)
    .join(" | ");

  // Nombre de personnes presentes a la ceremonie : si le groupe a coche "Oui",
  // tous les participants (+ invites supplementaires eventuels) ; sinon 0.
  const ceremonyAttendees = booking.ceremonyAttending
    ? booking.passengerCount + booking.ceremonyGuestCount
    : 0;

  const row = [
    new Date(booking.paidAt ?? booking.createdAt).toLocaleString("fr-FR"),
    booking.id,
    SHEET_STATUS_LABEL[booking.status] ?? booking.status,
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
    String(ceremonyAttendees),
  ];

  // Recherche d'une ligne existante par id (colonne B).
  let existingRow: number | null = null;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Inscriptions!B:B",
    });
    const values = res.data.values ?? [];
    for (let i = 0; i < values.length; i++) {
      if (values[i]?.[0] === booking.id) {
        existingRow = i + 1; // numero de ligne 1-based
        break;
      }
    }
  } catch (e) {
    console.warn("[sheets] lecture des ids impossible, ajout en fin de feuille", e);
  }

  if (existingRow) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Inscriptions!A${existingRow}:O${existingRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Inscriptions!A1",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  }
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
