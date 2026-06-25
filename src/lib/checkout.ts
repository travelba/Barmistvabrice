import { appUrl, CURRENCY, EVENT, FLIGHT, TRIP_NIGHTS } from "./config";
import { getStripe } from "./stripe";
import type { Booking } from "./types";

/**
 * (Re)cree une session Stripe Checkout pour une reservation existante.
 * Utilise pour "relancer" le lien de paiement d'une reservation pending
 * depuis le back-office. Renvoie l'URL de paiement et l'id de session.
 */
export async function createCheckoutSessionForBooking(
  booking: Booking,
): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe non configuré");

  const lineItems: Array<{
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string; description?: string };
    };
    quantity: number;
  }> = booking.rooms.map((r) => ({
    price_data: {
      currency: CURRENCY,
      unit_amount: r.priceCents * TRIP_NIGHTS,
      product_data: {
        name: r.roomName,
        description: `Hébergement — séjour de ${TRIP_NIGHTS} nuits`,
      },
    },
    quantity: r.quantity,
  }));

  if (booking.passengerCount > 0) {
    const flightUnit =
      Math.round(booking.flightTotalCents / booking.passengerCount) ||
      FLIGHT.pricePerPassengerCents;
    lineItems.push({
      price_data: {
        currency: CURRENCY,
        unit_amount: flightUnit,
        product_data: {
          name: `Vol privé ${EVENT.destination}`,
          description: "Billet aller-retour par passager",
        },
      },
      quantity: booking.passengerCount,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    customer_email: booking.email,
    client_reference_id: booking.id,
    metadata: { bookingId: booking.id },
    success_url: `${appUrl()}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/reservation?canceled=1`,
    locale: "fr",
  });

  if (!session.url) throw new Error("URL de paiement indisponible");
  return { url: session.url, sessionId: session.id };
}
