import { NextResponse } from "next/server";
import { getHotels } from "@/lib/data";
import { FLIGHT, TRIP_NIGHTS } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hotels = await getHotels();
    // Front client : on n'expose que les chambres encore reservables.
    // L'admin continue d'utiliser getHotels() cote serveur (toutes les chambres).
    const publicHotels = hotels.map((h) => {
      const roomTypes = h.roomTypes.filter((rt) => rt.available > 0);
      const remaining = roomTypes.reduce((acc, rt) => acc + rt.available, 0);
      return {
        ...h,
        roomTypes,
        remaining: Math.min(remaining, h.capacityMax),
      };
    });
    return NextResponse.json({
      hotels: publicHotels,
      nights: TRIP_NIGHTS,
      flight: {
        pricePerPassengerCents: FLIGHT.pricePerPassengerCents,
        origin: FLIGHT.origin,
        destination: FLIGHT.destination,
        outboundDate: FLIGHT.outboundDate,
        returnDate: FLIGHT.returnDate,
        carrierName: FLIGHT.carrierName,
      },
    });
  } catch (e) {
    console.error("[api/hotels]", e);
    return NextResponse.json({ error: "Erreur de chargement" }, { status: 500 });
  }
}
