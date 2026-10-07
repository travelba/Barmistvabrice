import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reservationVoucherBuffer } from "../src/lib/pdf/reservationVoucher";
import {
  PLACEHOLDER_PASSENGER_DOB,
  TRAVEL_BA,
  buildReservationVoucher,
  paidFlightSeats,
} from "../src/lib/reservation-voucher";
import type { Booking } from "../src/lib/types";

/** Forme de la réservation Aouizerate telle qu'elle est stockée (contact masqué ici). */
function aouizerateBooking(): Booking {
  return {
    id: "f4638115-6a59-492c-8b35-fcb7c067daec",
    groupName: "Aouizerate",
    email: "contact@example.com",
    phone: "+33000000000",
    hotelId: "santa-marina",
    hotelName: "Santa-Marina - Mykonos",
    status: "paid",
    totalCents: 203600,
    roomsTotalCents: 114600,
    flightTotalCents: 89000,
    passengerCount: 1,
    rooms: [
      {
        roomTypeId: "santa-marina-superior-sea-view-room",
        roomName: "Superior Sea View Room",
        quantity: 1,
        priceCents: 57300,
      },
    ],
    passengers: [
      { firstName: "Michel Ange", lastName: "Aouizerate", dateOfBirth: PLACEHOLDER_PASSENGER_DOB },
      { firstName: "Charlotte", lastName: "Aouizerate", dateOfBirth: PLACEHOLDER_PASSENGER_DOB },
    ],
    ceremonyAttending: true,
    ceremonyGuestCount: 0,
    stripeSessionId: null,
    paymentMethod: "stripe",
    createdAt: "2026-09-16T15:23:18.965Z",
    paidAt: "2026-09-28T07:50:10.373Z",
  };
}

describe("voucher de réservation", () => {
  it("reprend l'hôtel, le vol privé et marque les champs absents TBC", () => {
    const voucher = buildReservationVoucher(aouizerateBooking(), {
      location: "Ornos Bay, Mykonos",
      stars: 5,
    });
    assert.equal(voucher.reference, "F4638115");
    assert.equal(voucher.groupName, "Aouizerate");
    assert.equal(voucher.hotel.name, "Santa-Marina - Mykonos");
    assert.equal(voucher.hotel.location, "Ornos Bay, Mykonos");
    assert.equal(voucher.hotel.stars, 5);
    assert.deepEqual(
      voucher.hotel.rooms,
      [{ name: "Superior Sea View Room", quantity: 1 }],
    );
    assert.match(voucher.hotel.checkIn, /9 octobre 2026/);
    assert.match(voucher.hotel.checkOut, /11 octobre 2026/);
    assert.equal(voucher.hotel.nights, 2);
    assert.equal(voucher.hotel.checkInTime, "TBC");
    assert.equal(voucher.hotel.checkOutTime, "TBC");
    assert.equal(voucher.hotel.confirmationNumber, "TBC");
    assert.equal(paidFlightSeats(aouizerateBooking()), 1);
    assert.ok(voucher.flight);
    assert.equal(voucher.flight.seatsPaid, 1);
    assert.equal(voucher.flight.passengerAssignment, "TBC");
    assert.equal(voucher.flight.pnr, "TBC");
    assert.equal(voucher.flight.outbound.flightNo, "TB 0910");
    assert.equal(voucher.flight.outbound.fromCode, "CDG");
    assert.equal(voucher.flight.outbound.toCode, "JMK");
    assert.equal(voucher.flight.inbound.flightNo, "TB 1011");
    assert.equal(voucher.travellers[0].dateOfBirth, "TBC");
    assert.equal(voucher.travellers[1].firstName, "Charlotte");
    assert.equal(TRAVEL_BA.iata, "20291655");
    assert.equal(TRAVEL_BA.navy, "#0B192C");
  });

  it("omet le vol quand aucun billet n'est payé", () => {
    const booking = aouizerateBooking();
    booking.flightTotalCents = 0;
    booking.passengerCount = 0;
    booking.passengers = [];
    const voucher = buildReservationVoucher(booking);
    assert.equal(voucher.flight, null);
    assert.equal(voucher.travellers.length, 0);
  });

  it("produit un PDF", async () => {
    const voucher = buildReservationVoucher(aouizerateBooking(), {
      location: "Ornos Bay, Mykonos",
      stars: 5,
    });
    const pdf = await reservationVoucherBuffer(voucher);
    assert.equal(pdf.subarray(0, 5).toString("latin1"), "%PDF-");
    assert.ok(pdf.length > 2000);
  });
});
