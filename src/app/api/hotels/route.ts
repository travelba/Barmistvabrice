import { NextResponse } from "next/server";
import { getHotels } from "@/lib/data";
import { FLIGHT, TRIP_NIGHTS } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hotels = await getHotels();
    return NextResponse.json({
      hotels,
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
