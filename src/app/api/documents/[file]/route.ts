import { getBookingById } from "@/lib/data";
import { parseBookingDocsFileName, verifyBookingDocToken } from "@/lib/doc-token";
import { travelDocsBuffer } from "@/lib/pdf/travelDocs";
import type { Booking } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Telechargement du carnet de voyage via une URL en .pdf :
 *   /api/documents/carnet_<bookingId>_<token>.pdf
 * WhatsApp/Meta exige une extension de fichier reconnue pour les templates
 * media — l'ancienne route a query string (?booking_id=...) reste en place
 * pour les liens deja distribues.
 *
 * /api/documents/sample.pdf sert un exemplaire de demonstration (donnees
 * fictives) : Meta doit pouvoir telecharger le media d'exemple du template
 * lors de la revue.
 */

const SAMPLE_BOOKING: Booking = {
  id: "00000000-0000-0000-0000-000000000000",
  groupName: "Famille Exemple",
  email: "exemple@travelba.fr",
  phone: "+33600000000",
  hotelId: "sample",
  hotelName: "Santa Marina Resort",
  status: "paid",
  totalCents: 274400,
  roomsTotalCents: 96400,
  flightTotalCents: 178000,
  passengerCount: 2,
  rooms: [
    { roomTypeId: "sample", roomName: "Chambre Deluxe Vue Mer", quantity: 1, priceCents: 48200 },
  ],
  passengers: [
    { firstName: "Prénom", lastName: "Nom", dateOfBirth: "1980-01-01" },
    { firstName: "Prénom", lastName: "Nom 2", dateOfBirth: "1982-01-01" },
  ],
  ceremonyAttending: true,
  ceremonyGuestCount: 0,
  stripeSessionId: null,
  createdAt: new Date().toISOString(),
  paidAt: new Date().toISOString(),
};

function pdfResponse(pdf: Buffer, filename: string): Response {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;

  if (file === "sample.pdf") {
    try {
      const pdf = await travelDocsBuffer(SAMPLE_BOOKING);
      return pdfResponse(pdf, "carnet-voyage-exemple.pdf");
    } catch (e) {
      console.error("[api/documents/sample]", e);
      return new Response("Erreur génération PDF", { status: 500 });
    }
  }

  const parsed = parseBookingDocsFileName(file);
  if (!parsed) {
    return new Response("Document inconnu", { status: 404 });
  }
  if (!verifyBookingDocToken(parsed.bookingId, parsed.token)) {
    return new Response("Lien invalide ou expiré", { status: 403 });
  }

  const booking = await getBookingById(parsed.bookingId);
  if (!booking) {
    return new Response("Réservation introuvable", { status: 404 });
  }

  try {
    const pdf = await travelDocsBuffer(booking);
    return pdfResponse(pdf, `carnet-voyage-${booking.id.slice(0, 8)}.pdf`);
  } catch (e) {
    console.error("[api/documents/file]", e);
    return new Response("Erreur génération PDF", { status: 500 });
  }
}
