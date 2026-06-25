import { FLIGHT, TRIP_NIGHTS } from "./config";
import type { BookingDraft, HotelAvailability, PriceBreakdown } from "./types";

/**
 * Recalcule le prix de maniere autoritaire a partir des donnees serveur.
 * Ne jamais faire confiance aux montants envoyes par le client.
 */
export function computePrice(draft: BookingDraft, hotels: HotelAvailability[]): PriceBreakdown {
  const hotel = hotels.find((h) => h.id === draft.hotelId);
  if (!hotel) throw new Error("Hôtel introuvable");

  const nights = TRIP_NIGHTS;
  const rooms = draft.rooms
    .filter((r) => r.quantity > 0)
    .map((r) => {
      const rt = hotel.roomTypes.find((x) => x.id === r.roomTypeId);
      if (!rt) throw new Error("Type de chambre introuvable");
      const lineCents = rt.priceCents * r.quantity * nights;
      return {
        roomTypeId: rt.id,
        roomName: rt.name,
        quantity: r.quantity,
        unitCents: rt.priceCents,
        lineCents,
      };
    });

  const roomsTotalCents = rooms.reduce((acc, r) => acc + r.lineCents, 0);
  const passengerCount = draft.passengers.length;
  const flightUnitCents = FLIGHT.pricePerPassengerCents;
  const flightTotalCents = passengerCount * flightUnitCents;

  return {
    rooms,
    nights,
    roomsTotalCents,
    passengerCount,
    flightUnitCents,
    flightTotalCents,
    totalCents: roomsTotalCents + flightTotalCents,
  };
}

export function formatEuro(cents: number, locale = "fr-FR"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);
}
