import Link from "next/link";
import { CheckCircle2, Clock, FileDown } from "lucide-react";
import { getBookingById, getBookingByStripeSession, getHotels } from "@/lib/data";
import { fulfillBooking } from "@/lib/fulfillment";
import { getStripe } from "@/lib/stripe";
import { formatEuro } from "@/lib/pricing";
import { EVENT, FLIGHT, TRIP_NIGHTS } from "@/lib/config";
import { BoardingPasses } from "@/components/flight/BoardingPasses";
import { HotelVoucherDownload } from "@/components/hotel/HotelVoucherDownload";
import type { Booking } from "@/lib/types";

export const dynamic = "force-dynamic";

async function resolveBooking(params: {
  session_id?: string;
  booking_id?: string;
}): Promise<Booking | null> {
  // Mode demo : reservation deja confirmee cote serveur.
  if (params.booking_id) {
    return getBookingById(params.booking_id);
  }

  // Mode Stripe : on verifie la session et on finalise en secours si besoin.
  if (params.session_id) {
    const stripe = getStripe();
    let booking = await getBookingByStripeSession(params.session_id);
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(params.session_id);
        const bookingId = (session.metadata?.bookingId as string) ?? booking?.id;
        if (session.payment_status === "paid" && bookingId) {
          await fulfillBooking(bookingId); // idempotent
          booking = await getBookingById(bookingId);
        }
      } catch (e) {
        console.error("[confirmation] retrieve session", e);
      }
    }
    return booking;
  }
  return null;
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; booking_id?: string; demo?: string }>;
}) {
  const params = await searchParams;
  const booking = await resolveBooking(params);
  const paid = booking?.status === "paid";

  // Metadonnees hotel (photo / localisation / etoiles) pour le bon de confirmation.
  let hotelMeta: { location?: string; stars?: number; photo?: string } = {};
  if (paid && booking) {
    try {
      const hotels = await getHotels();
      const h = hotels.find((x) => x.id === booking.hotelId);
      if (h) hotelMeta = { location: h.location, stars: h.stars, photo: h.photos?.[0] };
    } catch (e) {
      console.error("[confirmation] hotel meta", e);
    }
  }

  return (
    <main className="min-h-screen bg-navy px-5 py-16 text-cream">
      <div className="mx-auto w-full max-w-lg text-center">
        {paid ? (
          <CheckCircle2 className="mx-auto h-16 w-16 text-gold-light" />
        ) : (
          <Clock className="mx-auto h-16 w-16 text-gold-light" />
        )}
        <p className="kicker mt-6 text-gold-light">Bar Mitsvah · {EVENT.childName}</p>
        <h1 className="mt-3 font-serif text-4xl">
          {paid ? "Réservation confirmée" : "Paiement en cours"}
        </h1>
        <div className="mx-auto my-5 gold-rule" />

        {booking ? (
          <>
            <p className="text-cream/80">
              {paid
                ? `Merci ${booking.groupName} ! Votre voyage pour la Bar Mitsvah de ${EVENT.childName} est confirmé.`
                : "Votre paiement est en cours de traitement. Vous recevrez un e-mail de confirmation."}
            </p>

            <div className="glass mt-8 rounded-2xl p-6 text-left">
              <p className="text-xs text-cream/60">Référence</p>
              <p className="font-mono text-sm text-cream">{booking.id}</p>

              <div className="my-4 h-px bg-cream/15" />
              <p className="font-serif text-lg">{booking.hotelName}</p>
              <ul className="mt-2 space-y-2 text-sm text-cream/80">
                {booking.rooms.map((r) => (
                  <li key={r.roomTypeId} className="flex items-start justify-between">
                    <span>
                      <span className="block">
                        {r.quantity}× {r.roomName}
                      </span>
                      <span className="text-xs text-cream/50">
                        {formatEuro(r.priceCents)} × {TRIP_NIGHTS} nuits
                      </span>
                    </span>
                    <span>{formatEuro(r.priceCents * r.quantity * TRIP_NIGHTS)}</span>
                  </li>
                ))}
              </ul>

              <div className="my-4 h-px bg-cream/15" />
              <div className="flex justify-between text-sm text-cream/80">
                <span>Vol privé · {booking.passengerCount} passager(s)</span>
                <span>{formatEuro(booking.flightTotalCents)}</span>
              </div>

              <div className="mt-4 flex items-end justify-between border-t border-cream/20 pt-4">
                <span className="text-sm">Total réglé</span>
                <span className="font-serif text-2xl text-gold-light">
                  {formatEuro(booking.totalCents)}
                </span>
              </div>
            </div>

            {paid && (
              <p className="mt-4 text-sm text-cream/70">Un e-mail de confirmation vous a été envoyé.</p>
            )}
          </>
        ) : (
          <p className="text-cream/80">
            Nous n&apos;avons pas retrouvé votre réservation. Si vous venez de payer, patientez quelques
            instants puis rafraîchissez la page.
          </p>
        )}

      </div>

      {paid && booking && (
        <div className="mx-auto mt-10 max-w-2xl text-center">
          <a
            href={`/api/documents?booking_id=${booking.id}`}
            className="btn-gold inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm"
          >
            <FileDown className="h-4 w-4" /> Télécharger mon carnet de voyage (PDF)
          </a>
          <p className="mt-2 text-xs text-cream/55">Billets d&apos;avion + confirmation hôtel réunis</p>
        </div>
      )}

      {paid && booking && booking.rooms.length > 0 && (
        <section className="mx-auto mt-16 w-full max-w-2xl">
          <p className="kicker text-center text-gold-light">{EVENT.destination}</p>
          <h2 className="mt-3 text-center font-serif text-3xl">Votre confirmation hôtel</h2>
          <div className="mx-auto my-5 gold-rule" />
          <p className="mx-auto max-w-md text-center text-sm text-cream/70">
            Votre bon de réservation pour le séjour. À conserver et présenter à l&apos;arrivée.
          </p>
          <div className="mt-10">
            <HotelVoucherDownload
              hotelName={booking.hotelName}
              location={hotelMeta.location}
              stars={hotelMeta.stars}
              photo={hotelMeta.photo}
              rooms={booking.rooms}
              roomsTotalCents={booking.roomsTotalCents}
              guestName={booking.groupName}
              guestCount={booking.passengerCount}
              bookingRef={booking.id}
            />
          </div>
        </section>
      )}

      {paid && booking && booking.passengers.length > 0 && (
        <section className="mx-auto mt-16 w-full max-w-2xl">
          <p className="kicker text-center text-gold-light">{FLIGHT.airline}</p>
          <h2 className="mt-3 text-center font-serif text-3xl">Vos billets d&apos;embarquement</h2>
          <div className="mx-auto my-5 gold-rule" />
          <p className="mx-auto max-w-md text-center text-sm text-cream/70">
            Un billet personnalisé par passager. Téléchargez-les et présentez-les à l&apos;embarquement.
          </p>
          <div className="mt-10">
            <BoardingPasses passengers={booking.passengers} bookingRef={booking.id} />
          </div>
        </section>
      )}

      <div className="mt-14 text-center">
        <Link href="/" className="btn-gold inline-block rounded-full px-8 py-3 text-sm">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
