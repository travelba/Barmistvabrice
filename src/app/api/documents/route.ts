import { getBookingById } from "@/lib/data";
import { travelDocsBuffer } from "@/lib/pdf/travelDocs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("booking_id");
  if (!bookingId) {
    return new Response("booking_id manquant", { status: 400 });
  }

  const booking = await getBookingById(bookingId);
  if (!booking) {
    return new Response("Réservation introuvable", { status: 404 });
  }

  try {
    const pdf = await travelDocsBuffer(booking);
    const body = new Uint8Array(pdf);
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="carnet-voyage-${booking.id.slice(0, 8)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[api/documents]", e);
    return new Response("Erreur génération PDF", { status: 500 });
  }
}
