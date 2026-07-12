import { FLIGHT, TRIP_NIGHTS } from "./config";
import type { BookingDraft, HotelAvailability, PriceBreakdown } from "./types";

/**
 * Recalcule le prix de maniere autoritaire a partir des donnees serveur.
 * Ne jamais faire confiance aux montants envoyes par le client.
 *
 * `includeFlight: false` : parcours hebreu — les invites israeliens ne partent
 * pas de Paris, le vol prive n'est ni propose ni facture.
 */
export function computePrice(
  draft: BookingDraft,
  hotels: HotelAvailability[],
  { includeFlight = true }: { includeFlight?: boolean } = {},
): PriceBreakdown {
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
  const flightUnitCents = includeFlight ? FLIGHT.pricePerPassengerCents : 0;
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
  // Intl.NumberFormat('fr-FR') utilise une ESPACE FINE INSÉCABLE (U+202F) comme
  // séparateur de milliers. De nombreuses polices (Fraunces, Helvetica/Times du
  // PDF…) n'ont pas ce glyphe : il s'affiche alors comme un caractère de
  // remplacement (« 1 146 » devient « 1/146 »). On normalise donc U+202F et
  // l'espace fine U+2009 en espace insécable standard U+00A0, partout supportée.
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" })
    .format(cents / 100)
    .replace(/[\u202F\u2009]/g, "\u00A0");
}
