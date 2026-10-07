import { EVENT, FLIGHT, TRIP_NIGHTS } from "./config";
import type { Booking } from "./types";

/**
 * Date saisie en masse à la place d'une vraie date de naissance
 * (59 passagers sur 101 dans la base). On ne l'imprime pas sur un voucher.
 */
export const PLACEHOLDER_PASSENGER_DOB = "1990-01-01";

export const TRAVEL_BA = {
  name: "Travel BA",
  legalName: "Travel Business Agency",
  address: "9 rue Greffulhe, 92300 Levallois-Perret",
  iata: "20291655",
  atoutFrance: "IM092260002",
  phone: "07 72 15 82 57",
  email: "contact@travelba.fr",
  web: "travelba.fr",
  navy: "#0B192C",
  champagne: "#C5A880",
  cream: "#FAF9F6",
} as const;

export interface VoucherHotel {
  name: string;
  location: string | null;
  stars: number | null;
  checkIn: string;
  checkOut: string;
  checkInTime: "TBC";
  checkOutTime: "TBC";
  nights: number;
  rooms: Array<{ name: string; quantity: number }>;
  confirmationNumber: "TBC";
}

export interface VoucherTraveller {
  firstName: string;
  lastName: string;
  /** ISO YYYY-MM-DD, ou TBC si la date stockée est le placeholder. */
  dateOfBirth: string;
}

export interface VoucherLeg {
  flightNo: string;
  dateLabel: string;
  fromCode: string;
  fromCity: string;
  toCode: string;
  toCity: string;
  depTime: string;
  arrTime: string;
  boarding: string;
}

export interface VoucherFlight {
  carrier: string;
  aircraft: string;
  seatsPaid: number;
  /** TBC quand le nombre de billets payés ne désigne pas un voyageur précis. */
  passengerAssignment: "TBC" | null;
  pnr: "TBC";
  outbound: VoucherLeg;
  inbound: VoucherLeg;
}

export interface ReservationVoucher {
  reference: string;
  bookingId: string;
  groupName: string;
  contactEmail: string;
  contactPhone: string;
  hotel: VoucherHotel;
  travellers: VoucherTraveller[];
  flight: VoucherFlight | null;
}

export interface VoucherHotelMeta {
  location?: string;
  stars?: number;
}

function frDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function leg(source: typeof FLIGHT.outbound | typeof FLIGHT.inbound): VoucherLeg {
  return {
    flightNo: source.flightNo,
    dateLabel: source.dateLabel,
    fromCode: source.fromCode,
    fromCity: source.fromCity,
    toCode: source.toCode,
    toCity: source.toCity,
    depTime: source.depTime,
    arrTime: source.arrTime,
    boarding: source.boarding,
  };
}

/** Nombre de places vol payées, d'après le montant (tarif unique du vol privé). */
export function paidFlightSeats(booking: Booking): number {
  if (booking.flightTotalCents <= 0) return 0;
  const unit = FLIGHT.pricePerPassengerCents;
  if (unit > 0 && booking.flightTotalCents % unit === 0) {
    return booking.flightTotalCents / unit;
  }
  return booking.passengerCount;
}

export function buildReservationVoucher(
  booking: Booking,
  hotel?: VoucherHotelMeta,
): ReservationVoucher {
  const seatsPaid = paidFlightSeats(booking);
  const travellers = booking.passengers.map((p) => ({
    firstName: p.firstName.trim(),
    lastName: p.lastName.trim(),
    dateOfBirth: p.dateOfBirth === PLACEHOLDER_PASSENGER_DOB ? "TBC" : p.dateOfBirth,
  }));
  const namedSeats = travellers.length;
  const flight: VoucherFlight | null =
    seatsPaid > 0
      ? {
          carrier: FLIGHT.carrierName,
          aircraft: FLIGHT.aircraft,
          seatsPaid,
          passengerAssignment: namedSeats === seatsPaid ? null : "TBC",
          pnr: "TBC",
          outbound: leg(FLIGHT.outbound),
          inbound: leg(FLIGHT.inbound),
        }
      : null;

  return {
    reference: booking.id.slice(0, 8).toUpperCase(),
    bookingId: booking.id,
    groupName: booking.groupName.trim(),
    contactEmail: booking.email.trim(),
    contactPhone: booking.phone.trim(),
    hotel: {
      name: booking.hotelName,
      location: hotel?.location?.trim() || null,
      stars: hotel?.stars ?? null,
      checkIn: frDate(EVENT.tripStartDate),
      checkOut: frDate(EVENT.tripEndDate),
      checkInTime: "TBC",
      checkOutTime: "TBC",
      nights: TRIP_NIGHTS,
      rooms: booking.rooms.map((r) => ({ name: r.roomName, quantity: r.quantity })),
      confirmationNumber: "TBC",
    },
    travellers,
    flight,
  };
}

export function voucherDownloadName(booking: Booking): string {
  const slug = booking.groupName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `voucher-${slug || "reservation"}-${booking.id.slice(0, 8)}.pdf`;
}
