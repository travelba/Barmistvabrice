import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/admin-auth";
import { deleteBooking, getBookingById } from "@/lib/data";

export const dynamic = "force-dynamic";

const schema = z.object({ bookingId: z.string().min(1) });

/**
 * Suppression definitive d'une reservation depuis le back-office.
 * La cascade (chambres, passagers) libere l'inventaire correspondant.
 */
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
    await deleteBooking(parsed.data.bookingId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/admin/bookings/delete]", e);
    const message = e instanceof Error ? e.message : "Erreur lors de la suppression";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
