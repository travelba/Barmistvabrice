export type Locale = "fr" | "he";

export interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  /** Nombre de personnes que la chambre peut accueillir. */
  capacity: number;
  /** Prix par nuit, en centimes d'euro. */
  priceCents: number;
  description: string;
  photos: string[];
  /** Stock total de chambres de ce type. */
  stockTotal: number;
  /** Places deja confirmees (payees). */
  booked: number;
  /** Places retenues temporairement (holds actifs). */
  held: number;
}

export interface Hotel {
  id: string;
  name: string;
  slug: string;
  description: string;
  location: string;
  stars: number;
  photos: string[];
  /** Capacite globale en nombre de chambres (places limitees par hotel). */
  capacityMax: number;
  sortOrder: number;
  roomTypes: RoomType[];
}

export interface RoomTypeAvailability extends RoomType {
  /** Chambres encore reservables (stockTotal - booked - held). */
  available: number;
}

export interface HotelAvailability extends Omit<Hotel, "roomTypes"> {
  roomTypes: RoomTypeAvailability[];
  /** Chambres restantes au global pour cet hotel. */
  remaining: number;
}

export interface CartRoom {
  roomTypeId: string;
  quantity: number;
}

export interface Passenger {
  firstName: string;
  lastName: string;
  /** Date de naissance ISO (YYYY-MM-DD). */
  dateOfBirth: string;
}

export interface ContactInfo {
  groupName: string;
  email: string;
  phone: string;
}

export interface BookingDraft {
  contact: ContactInfo;
  hotelId: string;
  rooms: CartRoom[];
  passengers: Passenger[];
  /** Presence a la mise des Tephilines (cas du lien "voyage"). */
  ceremonyAttending?: boolean;
  /** Nombre d'invites supplementaires a la ceremonie (hors participants au voyage). */
  ceremonyGuestCount?: number;
}

/**
 * Reponse a l'invitation a la mise des Tephilines (lien "ceremonie" seul).
 * `source` distingue un RSVP autonome ("ceremony") d'une presence renseignee
 * lors d'une reservation de voyage ("voyage").
 */
export interface CeremonyRsvp {
  id: string;
  name: string;
  email: string;
  phone: string;
  attending: boolean;
  /** Nombre total de personnes presentes (le repondant inclus). */
  guestCount: number;
  source: "ceremony" | "voyage";
  createdAt: string;
}

export type BookingStatus = "pending" | "paid" | "cancelled" | "expired";

export interface Booking {
  id: string;
  groupName: string;
  email: string;
  phone: string;
  hotelId: string;
  hotelName: string;
  status: BookingStatus;
  totalCents: number;
  roomsTotalCents: number;
  flightTotalCents: number;
  passengerCount: number;
  rooms: Array<{ roomTypeId: string; roomName: string; quantity: number; priceCents: number }>;
  passengers: Passenger[];
  /** Presence a la mise des Tephilines. */
  ceremonyAttending: boolean;
  /** Invites supplementaires a la ceremonie (hors voyageurs). */
  ceremonyGuestCount: number;
  stripeSessionId: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface PriceBreakdown {
  /** unitCents = prix par nuit ; lineCents = prix par nuit x nuits x quantite. */
  rooms: Array<{ roomTypeId: string; roomName: string; quantity: number; unitCents: number; lineCents: number }>;
  nights: number;
  roomsTotalCents: number;
  passengerCount: number;
  flightUnitCents: number;
  flightTotalCents: number;
  totalCents: number;
}
