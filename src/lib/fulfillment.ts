import { confirmBooking, getBookingById } from "./data";
import { upsertBookingToSheet } from "./sheets";
import { sendConfirmationAgencyEmail } from "./email";
import { sendConfirmationWhatsapp } from "./whatsapp";
import type { Locale } from "./types";

/**
 * Finalise une reservation apres paiement reussi :
 *  1. confirme la reservation (decompte definitif de l'inventaire)
 *  2. met a jour la ligne du Google Sheet
 *  3. notifie — UNE SEULE FOIS — l'invite par WhatsApp et l'agence par e-mail
 * Idempotent : le webhook Stripe et la page de confirmation peuvent tous deux
 * appeler cette fonction. Les notifications ne partent que si la reservation
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
  // Les notifications ne partent qu'a la premiere confirmation (anti-doublon) :
  // WhatsApp a l'invite, e-mail a l'agence.
  if (firstConfirmation) {
    tasks.push(sendConfirmationWhatsapp(booking, locale));
    tasks.push(sendConfirmationAgencyEmail(booking, locale));
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
