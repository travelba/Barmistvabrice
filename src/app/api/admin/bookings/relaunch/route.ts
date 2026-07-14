import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getBookingById, attachStripeSession, extendBookingHold } from "@/lib/data";
import { createCheckoutSessionForBooking } from "@/lib/checkout";
import { HOLD_DURATION_MINUTES, isStripeConfigured } from "@/lib/config";
import { sendPaymentRelaunchWhatsapp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const schema = z.object({
  bookingId: z.string().min(1),
  locale: z.enum(["fr", "he"]).optional(),
});

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

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

  if (!isStripeConfigured) {
    return NextResponse.json({ error: "Stripe non configuré" }, { status: 400 });
  }

  try {
    const booking = await getBookingById(parsed.data.bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }
    if (booking.status === "paid") {
      return NextResponse.json({ error: "Réservation déjà payée." }, { status: 409 });
    }
    if (booking.status !== "pending") {
      return NextResponse.json(
        { error: "Seules les réservations en attente peuvent être relancées." },
        { status: 409 },
      );
    }

    const { url, sessionId } = await createCheckoutSessionForBooking(booking);
    await attachStripeSession(booking.id, sessionId);
    // Prolonge le hold pour laisser au client le temps de payer.
    await extendBookingHold(booking.id, HOLD_DURATION_MINUTES);

    const locale = parsed.data.locale ?? "fr";
    let whatsappSent = false;
    try {
      whatsappSent = await sendPaymentRelaunchWhatsapp(booking, url, locale);
    } catch (e) {
      console.error("[api/admin/bookings/relaunch] whatsapp", e);
    }

    return NextResponse.json({ ok: true, url, whatsappSent });
  } catch (e) {
    console.error("[api/admin/bookings/relaunch]", e);
    const message = e instanceof Error ? e.message : "Erreur lors de la relance";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
