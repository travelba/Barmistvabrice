import type { Locale } from "./types";
import { formatEuro } from "./pricing";

/**
 * Traductions hebraiques du contenu provenant de la base / seed (hotels).
 * Le francais reste la source par defaut ; l'hebreu est fourni ici par cle (id d'hotel).
 * Les noms d'hotels et de chambres restent en latin (noms propres / categories).
 */
const HOTEL_DESCRIPTION_HE: Record<string, string> = {
  "santa-marina":
    "סנטה מרינה, מבית Luxury Collection: חצי-אי פרטי, חוף, וילות עם בריכה ושירות יוצא דופן.",
};

const HOTEL_LOCATION_HE: Record<string, string> = {
  "santa-marina": "מפרץ אורנוס, מיקונוס",
};

export function localizedHotelDescription(
  hotel: { id: string; description: string },
  locale: Locale,
): string {
  if (locale === "he") return HOTEL_DESCRIPTION_HE[hotel.id] ?? hotel.description;
  return hotel.description;
}

export function localizedHotelLocation(
  hotel: { id: string; location: string },
  locale: Locale,
): string {
  if (locale === "he") return HOTEL_LOCATION_HE[hotel.id] ?? hotel.location;
  return hotel.location;
}

/**
 * La description de chambre suit un schema (capacite + prix / nuit).
 * Le francais d'origine est conserve ; l'hebreu est genere a partir des donnees.
 */
export function localizedRoomDescription(
  room: { capacity: number; priceCents: number; description: string },
  locale: Locale,
): string {
  if (locale === "he") {
    return `${room.capacity} אנשים — ${formatEuro(room.priceCents)} / לילה`;
  }
  return room.description;
}
