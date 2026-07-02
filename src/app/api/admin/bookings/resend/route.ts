import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getBookingById } from "@/lib/data";
import { sendConfirmationWhatsapp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/**
 * Renvoie la confirmation WhatsApp (message + carnet de voyage PDF) d'une
 * reservation payee — par exemple si l'invite a change de numero ou n'a pas
 * recu le message initial.
 */

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

  try {
    const booking = await getBookingById(parsed.data.bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }
    if (booking.status !== "paid") {
      return NextResponse.json(
        { error: "Seules les réservations payées peuvent être renvoyées." },
        { status: 409 },
      );
    }

    await sendConfirmationWhatsapp(booking, parsed.data.locale ?? "fr");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/admin/bookings/resend]", e);
    const message = e instanceof Error ? e.message : "Erreur lors du renvoi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
