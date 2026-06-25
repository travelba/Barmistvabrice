import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl, CURRENCY, EVENT, isStripeConfigured } from "@/lib/config";
import { getHotels, createPendingBooking, attachStripeSession } from "@/lib/data";
import { computePrice } from "@/lib/pricing";
import { getStripe } from "@/lib/stripe";
import { fulfillBooking } from "@/lib/fulfillment";
import type { BookingDraft } from "@/lib/types";

export const dynamic = "force-dynamic";

const schema = z.object({
  contact: z.object({
    groupName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(6),
  }),
  hotelId: z.string().min(1),
  rooms: z
    .array(z.object({ roomTypeId: z.string(), quantity: z.number().int().positive() }))
    .min(1),
  passengers: z
    .array(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        dateOfBirth: z.string().min(4),
      }),
    )
    .min(1),
  ceremonyAttending: z.boolean().optional(),
  ceremonyGuestCount: z.number().int().min(0).max(50).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const draft: BookingDraft = parsed.data;

  try {
    // Prix recalcule cote serveur a partir des donnees autoritaires.
    const hotels = await getHotels();
    const price = computePrice(draft, hotels);
    if (price.totalCents <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    // Cree la reservation en attente + holds (anti-survente).
    const { bookingId } = await createPendingBooking(draft, price);

    // Mode demo (Stripe non configure) : on confirme directement.
    if (!isStripeConfigured) {
      await fulfillBooking(bookingId);
      return NextResponse.json({ demo: true, bookingId });
    }

    const stripe = getStripe()!;
    const lineItems: Array<{
      price_data: {
        currency: string;
        unit_amount: number;
        product_data: { name: string; description?: string };
      };
      quantity: number;
    }> = price.rooms.map((r) => ({
      price_data: {
        currency: CURRENCY,
        unit_amount: r.unitCents * price.nights,
        product_data: {
          name: r.roomName,
          description: `Hébergement — séjour de ${price.nights} nuits`,
        },
      },
      quantity: r.quantity,
    }));
    lineItems.push({
      price_data: {
        currency: CURRENCY,
        unit_amount: price.flightUnitCents,
        product_data: {
          name: `Vol privé ${EVENT.destination}`,
          description: "Billet aller-retour par passager",
        },
      },
      quantity: price.passengerCount,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: draft.contact.email,
      client_reference_id: bookingId,
      metadata: { bookingId },
      success_url: `${appUrl()}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/reservation?canceled=1`,
      locale: "fr",
    });

    await attachStripeSession(bookingId, session.id);
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[api/checkout]", e);
    const message = e instanceof Error ? e.message : "Erreur lors de la création du paiement";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
