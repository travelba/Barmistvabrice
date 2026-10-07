import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getBookingById, getHotels } from "@/lib/data";
import { reservationVoucherBuffer } from "@/lib/pdf/reservationVoucher";
import { buildReservationVoucher, voucherDownloadName } from "@/lib/reservation-voucher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Voucher hôtel + vol pour une réservation. Réservé à l'admin connecté. */
export async function GET(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const bookingId = new URL(req.url).searchParams.get("bookingId")?.trim();
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId manquant" }, { status: 400 });
  }
  const booking = await getBookingById(bookingId);
  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  let location: string | undefined;
  let stars: number | undefined;
  try {
    const hotels = await getHotels();
    const hotel = hotels.find((h) => h.id === booking.hotelId);
    location = hotel?.location;
    stars = hotel?.stars;
  } catch {
    // Le voucher reste émis avec le nom d'hôtel porté par la réservation.
  }

  try {
    const voucher = buildReservationVoucher(booking, { location, stars });
    const pdf = await reservationVoucherBuffer(voucher);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${voucherDownloadName(booking)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[api/admin/bookings/voucher]", e);
    return NextResponse.json({ error: "Erreur génération du voucher" }, { status: 500 });
  }
}
