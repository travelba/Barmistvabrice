import { getBookingById, getBookingByStripeSession, getHotels } from "@/lib/data";
import { fulfillBooking } from "@/lib/fulfillment";
import { getStripe } from "@/lib/stripe";
import type { Booking } from "@/lib/types";

export interface ConfirmationData {
  booking: Booking | null;
  paid: boolean;
  hotelMeta: { location?: string; stars?: number; photo?: string };
}

async function resolveBooking(params: {
  session_id?: string;
  booking_id?: string;
}): Promise<Booking | null> {
  // Mode demo : reservation deja confirmee cote serveur.
  if (params.booking_id) {
    return getBookingById(params.booking_id);
  }

  // Mode Stripe : on verifie la session et on finalise en secours si besoin.
  if (params.session_id) {
    const stripe = getStripe();
    let booking = await getBookingByStripeSession(params.session_id);
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(params.session_id);
        const bookingId = (session.metadata?.bookingId as string) ?? booking?.id;
        const locale = session.metadata?.locale === "he" ? "he" : "fr";
        if (session.payment_status === "paid" && bookingId) {
          await fulfillBooking(bookingId, locale); // idempotent
          booking = await getBookingById(bookingId);
        }
      } catch (e) {
        console.error("[confirmation] retrieve session", e);
      }
    }
    return booking;
  }
  return null;
}

export async function loadConfirmation(params: {
  session_id?: string;
  booking_id?: string;
}): Promise<ConfirmationData> {
  const booking = await resolveBooking(params);
  const paid = booking?.status === "paid";

  // Metadonnees hotel (photo / localisation / etoiles) pour le bon de confirmation.
  let hotelMeta: ConfirmationData["hotelMeta"] = {};
  if (paid && booking) {
    try {
      const hotels = await getHotels();
      const h = hotels.find((x) => x.id === booking.hotelId);
      if (h) hotelMeta = { location: h.location, stars: h.stars, photo: h.photos?.[0] };
    } catch (e) {
      console.error("[confirmation] hotel meta", e);
    }
  }

  return { booking, paid, hotelMeta };
}
