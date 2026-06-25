import { confirmBooking } from "./data";
import { appendBookingToSheet } from "./sheets";
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
    appendBookingToSheet(booking),
    sendConfirmationEmails(booking),
  ]).then((results) => {
    results.forEach((r) => {
      if (r.status === "rejected") console.error("[fulfillment]", r.reason);
    });
  });
}
