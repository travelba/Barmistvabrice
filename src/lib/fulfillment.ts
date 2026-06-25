import { confirmBooking, getBookingById } from "./data";
import { upsertBookingToSheet } from "./sheets";
import { sendConfirmationEmails } from "./email";
import type { Locale } from "./types";

/**
 * Finalise une reservation apres paiement reussi :
 *  1. confirme la reservation (decompte definitif de l'inventaire)
 *  2. met a jour la ligne du Google Sheet
 *  3. envoie les emails (invite + agence) — UNE SEULE FOIS
 * Idempotent : le webhook Stripe et la page de confirmation peuvent tous deux
 * appeler cette fonction. Les emails ne sont envoyes que si la reservation
 * vient reellement de passer a 'paid' (firstConfirmation).
 */
export async function fulfillBooking(
  bookingId: string,
  locale: Locale = "fr",
): Promise<void> {
  const { booking, firstConfirmation } = await confirmBooking(bookingId);
  if (!booking) {
    console.warn("[fulfillment] booking introuvable", bookingId);
    return;
  }

  // Le Sheet est idempotent (upsert par id) : on le met a jour a chaque fois.
  const tasks: Array<Promise<unknown>> = [upsertBookingToSheet(booking)];
  // Les emails ne partent qu'a la premiere confirmation pour eviter les doublons.
  if (firstConfirmation) {
    tasks.push(sendConfirmationEmails(booking, locale));
  }

  await Promise.allSettled(tasks).then((results) => {
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
