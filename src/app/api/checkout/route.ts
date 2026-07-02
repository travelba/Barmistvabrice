import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl, CURRENCY, EVENT, isStripeConfigured } from "@/lib/config";
import { getHotels, createPendingBooking, attachStripeSession } from "@/lib/data";
import { computePrice } from "@/lib/pricing";
import { getStripe } from "@/lib/stripe";
import { fulfillBooking, recordBookingInSheet } from "@/lib/fulfillment";
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
  locale: z.enum(["fr", "he"]).optional(),
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
  const locale = parsed.data.locale ?? "fr";
  // Stripe Checkout ne propose pas l'hebreu : on laisse Stripe detecter ("auto").
  const stripeLocale = locale === "he" ? "auto" : "fr";

  // Regle metier : pas plus de chambres que de participants.
  const totalRooms = draft.rooms.reduce((acc, r) => acc + r.quantity, 0);
  if (totalRooms > draft.passengers.length) {
    return NextResponse.json(
      { error: "Le nombre de chambres ne peut pas dépasser le nombre de participants." },
      { status: 400 },
    );
  }

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
      await fulfillBooking(bookingId, locale);
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
      metadata: { bookingId, locale },
      success_url: `${appUrl()}/confirmation?session_id={CHECKOUT_SESSION_ID}&lang=${locale}`,
      cancel_url: `${appUrl()}/reservation?canceled=1&lang=${locale}`,
      locale: stripeLocale,
    });

    await attachStripeSession(bookingId, session.id);
    // Trace immediate dans le Google Sheet : la place est bloquee, paiement
    // "en attente". La ligne passera a "Payé" via le webhook si le client paie.
    await recordBookingInSheet(bookingId);
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[api/checkout]", e);
    const message = e instanceof Error ? e.message : "Erreur lors de la création du paiement";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
