import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getBookingByStripeSession } from "@/lib/data";
import { fulfillBooking } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe non configuré" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (e) {
    console.error("[webhook] signature invalide", e);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId =
        (session.metadata?.bookingId as string | undefined) ??
        session.client_reference_id ??
        (session.id ? (await getBookingByStripeSession(session.id))?.id : undefined);

      if (session.payment_status === "paid" && bookingId) {
        const metaLocale = session.metadata?.locale;
        const locale = metaLocale === "he" ? "he" : "fr";
        await fulfillBooking(bookingId, locale);
      }
    }
  } catch (e) {
    console.error("[webhook] traitement", e);
    return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
