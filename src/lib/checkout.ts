import { appUrl, CURRENCY, EVENT, TRIP_NIGHTS } from "./config";
import { getStripe } from "./stripe";
import type { Booking } from "./types";

type CheckoutLineItem = {
  price_data: {
    currency: string;
    unit_amount: number;
    product_data: { name: string; description?: string };
  };
  quantity: number;
};

/**
 * Construit les line items Stripe a partir d'une reservation existante.
 * Exporte pour les tests : le parcours hebreu a flightTotalCents = 0 et
 * ne doit JAMAIS reintroduire le vol (un `|| prixParDefaut` le faisait).
 */
export function buildCheckoutLineItemsForBooking(booking: Booking): CheckoutLineItem[] {
  const lineItems: CheckoutLineItem[] = booking.rooms.map((r) => ({
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

  // Uniquement si la reservation d'origine incluait deja le vol.
  // Ne pas retomber sur un prix par defaut quand flightTotalCents === 0 (HE).
  if (booking.flightTotalCents > 0 && booking.passengerCount > 0) {
    const flightUnit = Math.round(booking.flightTotalCents / booking.passengerCount);
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

  return lineItems;
}

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

  const lineItems = buildCheckoutLineItemsForBooking(booking);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    customer_email: booking.email,
    client_reference_id: booking.id,
    metadata: { bookingId: booking.id },
    success_url: `${appUrl()}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/reservation?canceled=1`,
    // La langue du parcours d'origine n'est pas stockee sur la reservation :
    // on laisse Stripe s'adapter au navigateur de l'invite.
    locale: "auto",
  });

  if (!session.url) throw new Error("URL de paiement indisponible");
  return { url: session.url, sessionId: session.id };
}
