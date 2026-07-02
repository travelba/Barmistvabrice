import type { HotelAvailability, RoomTypeAvailability } from "./types";

/**
 * Correspondance entre les clés de la page voyage (/data/hotels.json :
 * hotelA, hotelB…) et les hôtels du tunnel (/api/hotels), robuste aux
 * différences d'identifiants (démo vs Supabase) : on retombe sur une
 * recherche par id/nom normalisé si la clé n'est pas un id direct.
 */
export const HOTEL_KEY_ALIASES: Record<string, string[]> = {
  hotelA: ["once", "once in mykonos"],
  hotelB: ["santa-marina", "santa marina"],
};

export const normalizeKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function resolveHotelByKey(
  key: string,
  hotels: HotelAvailability[],
): HotelAvailability | null {
  const direct = hotels.find((h) => h.id === key);
  if (direct) return direct;
  const wanted = (HOTEL_KEY_ALIASES[key] ?? [key]).map(normalizeKey);
  return (
    hotels.find((h) => {
      const hid = normalizeKey(h.id);
      const hname = normalizeKey(h.name);
      return wanted.some((w) => w.length > 0 && (hid.includes(w) || hname.includes(w)));
    }) ?? null
  );
}

/** Retrouve un type de chambre par nom (exact puis approché) dans un hôtel. */
export function resolveRoomByName(
  hotel: HotelAvailability,
  roomName: string,
): RoomTypeAvailability | null {
  const wanted = normalizeKey(roomName);
  if (!wanted) return null;
  return (
    hotel.roomTypes.find((r) => normalizeKey(r.name) === wanted) ??
    hotel.roomTypes.find((r) => {
      const n = normalizeKey(r.name);
      return n.includes(wanted) || wanted.includes(n);
    }) ??
    null
  );
}
