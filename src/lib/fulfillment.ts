import { confirmBooking, getBookingById } from "./data";
import { upsertBookingToSheet } from "./sheets";
import { sendConfirmationEmails } from "./email";

/**
 * Finalise une reservation apres paiement reussi :
 *  1. confirme la reservation (decompte definitif de l'inventaire)
 *  2. ajoute une ligne au Google Sheet
 *  3. envoie les emails (invite + agence)
 * Idempotent : confirmBooking ne repasse pas a 'paid' si deja paye, mais
 * les notifications peuvent etre redeclenchees — on protege via le flag returned.
 */
export async function fulfillBooking(bookingId: string): Promise<void> {
  const booking = await confirmBooking(bookingId);
  if (!booking) {
    console.warn("[fulfillment] booking introuvable", bookingId);
    return;
  }

  await Promise.allSettled([
    upsertBookingToSheet(booking),
    sendConfirmationEmails(booking),
  ]).then((results) => {
    results.forEach((r) => {
      if (r.status === "rejected") console.error("[fulfillment]", r.reason);
    });
  });
}

/**
 * Ecrit (ou met a jour) une reservation dans le Google Sheet, sans envoyer
 * d'email. Utilise des la creation d'une reservation pending (paiement non
 * encore finalise) et apres une annulation back-office.
 */
export async function recordBookingInSheet(bookingId: string): Promise<void> {
  try {
    const booking = await getBookingById(bookingId);
    if (booking) await upsertBookingToSheet(booking);
  } catch (e) {
    console.error("[fulfillment] recordBookingInSheet", e);
  }
}
