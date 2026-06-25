import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/admin-auth";
import { cancelBooking } from "@/lib/data";
import { recordBookingInSheet } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

const schema = z.object({ bookingId: z.string().min(1) });

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

  try {
    const booking = await cancelBooking(parsed.data.bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }
    if (booking.status === "paid") {
      return NextResponse.json(
        { error: "Réservation déjà payée — annulation impossible." },
        { status: 409 },
      );
    }
    // Met a jour la ligne Google Sheet (statut "Annulée (place libérée)").
    await recordBookingInSheet(booking.id);
    return NextResponse.json({ ok: true, status: booking.status });
  } catch (e) {
    console.error("[api/admin/bookings/cancel]", e);
    const message = e instanceof Error ? e.message : "Erreur lors de l'annulation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
