import { HOLD_DURATION_MINUTES, isSupabaseConfigured } from "./config";
import { HOTELS_SEED } from "./seed-data";
import { getSupabaseAdmin } from "./supabase/admin";
import type {
  Booking,
  BookingDraft,
  CeremonyRsvp,
  HotelAvailability,
  PriceBreakdown,
} from "./types";

/* -------------------------------------------------------------------------- */
/*                          Demo (in-memory) backend                          */
/* -------------------------------------------------------------------------- */

interface DemoStore {
  bookings: Booking[];
  holdExpiry: Map<string, number>;
  rsvps: CeremonyRsvp[];
}

const g = globalThis as unknown as { __bmsbStore?: Partial<DemoStore> };
function store(): DemoStore {
  const s = (g.__bmsbStore ??= {});
  // Backfill defensif : le store persiste dans globalThis entre les hot-reloads,
  // d'anciennes instances peuvent ne pas avoir tous les champs.
  s.bookings ??= [];
  s.holdExpiry ??= new Map();
  s.rsvps ??= [];
  return s as DemoStore;
}

function isHoldActive(b: Booking): boolean {
  // Une reservation pending bloque la place tant qu'elle n'est pas annulee,
  // independamment de l'echeance du hold (paiement non finalise = place gardee).
  return b.status === "pending";
}

function computeAvailabilityDemo(): HotelAvailability[] {
  const s = store();
  // Comptage des chambres reservees (payees) et retenues (holds actifs) par type.
  const booked = new Map<string, number>();
  const held = new Map<string, number>();
  for (const b of s.bookings) {
    const target = b.status === "paid" ? booked : isHoldActive(b) ? held : null;
    if (!target) continue;
    for (const r of b.rooms) {
      target.set(r.roomTypeId, (target.get(r.roomTypeId) ?? 0) + r.quantity);
    }
  }
  return HOTELS_SEED.map((h) => {
    const roomTypes = h.roomTypes.map((rt) => {
      const bk = booked.get(rt.id) ?? 0;
      const hd = held.get(rt.id) ?? 0;
      const available = Math.max(0, rt.stockTotal - bk - hd);
      return { ...rt, booked: bk, held: hd, available };
    });
    const remaining = roomTypes.reduce((acc, rt) => acc + rt.available, 0);
    return { ...h, roomTypes, remaining: Math.min(remaining, h.capacityMax) };
  });
}

function createPendingDemo(draft: BookingDraft, price: PriceBreakdown): { bookingId: string } {
  const s = store();
  const hotels = computeAvailabilityDemo();
  const hotel = hotels.find((h) => h.id === draft.hotelId);
  if (!hotel) throw new Error("Hôtel introuvable");
  for (const cart of draft.rooms) {
    const rt = hotel.roomTypes.find((r) => r.id === cart.roomTypeId);
    if (!rt || rt.available < cart.quantity) {
      throw new Error(`Plus assez de disponibilité pour « ${rt?.name ?? cart.roomTypeId} »`);
    }
  }
  const id = crypto.randomUUID();
  const booking: Booking = {
    id,
    groupName: draft.contact.groupName,
    email: draft.contact.email,
    phone: draft.contact.phone,
    hotelId: hotel.id,
    hotelName: hotel.name,
    status: "pending",
    totalCents: price.totalCents,
    roomsTotalCents: price.roomsTotalCents,
    flightTotalCents: price.flightTotalCents,
    passengerCount: price.passengerCount,
    rooms: price.rooms.map((r) => ({
      roomTypeId: r.roomTypeId,
      roomName: r.roomName,
      quantity: r.quantity,
      priceCents: r.unitCents,
    })),
    passengers: draft.passengers,
    ceremonyAttending: draft.ceremonyAttending ?? true,
    ceremonyGuestCount: draft.ceremonyGuestCount ?? 0,
    stripeSessionId: null,
    createdAt: new Date().toISOString(),
    paidAt: null,
  };
  s.bookings.push(booking);
  s.holdExpiry.set(id, Date.now() + HOLD_DURATION_MINUTES * 60_000);
  return { bookingId: id };
}

/* -------------------------------------------------------------------------- */
/*                            Supabase backend                                */
/* -------------------------------------------------------------------------- */

async function getHotelsSupabase(): Promise<HotelAvailability[]> {
  const sb = getSupabaseAdmin()!;
  const { data: hotels, error } = await sb
    .from("hotels")
    .select("*, room_types(*)")
    .order("sort_order", { ascending: true });
  if (error) throw error;

  // Comptage des reservations actives par type de chambre.
  const { data: counts, error: cErr } = await sb.rpc("room_occupancy");
  if (cErr) throw cErr;
  const bookedMap = new Map<string, number>();
  const heldMap = new Map<string, number>();
  for (const row of (counts ?? []) as Array<{
    room_type_id: string;
    booked: number;
    held: number;
  }>) {
    bookedMap.set(row.room_type_id, Number(row.booked));
    heldMap.set(row.room_type_id, Number(row.held));
  }

  return (hotels ?? []).map((h: Record<string, unknown>) => {
    const rts = ((h.room_types as Array<Record<string, unknown>>) ?? [])
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .map((rt) => {
        const id = String(rt.id);
        const stockTotal = Number(rt.stock_total);
        const bk = bookedMap.get(id) ?? 0;
        const hd = heldMap.get(id) ?? 0;
        return {
          id,
          hotelId: String(h.id),
          name: String(rt.name),
          capacity: Number(rt.capacity),
          priceCents: Number(rt.price_cents),
          description: String(rt.description ?? ""),
          photos: (rt.photos as string[]) ?? [],
          stockTotal,
          booked: bk,
          held: hd,
          available: Math.max(0, stockTotal - bk - hd),
        };
      });
    const remaining = rts.reduce((acc, rt) => acc + rt.available, 0);
    return {
      id: String(h.id),
      name: String(h.name),
      slug: String(h.slug),
      description: String(h.description ?? ""),
      location: String(h.location ?? ""),
      stars: Number(h.stars ?? 5),
      photos: (h.photos as string[]) ?? [],
      capacityMax: Number(h.capacity_max),
      sortOrder: Number(h.sort_order ?? 0),
      roomTypes: rts,
      remaining: Math.min(remaining, Number(h.capacity_max)),
    };
  });
}

function mapBookingRow(row: Record<string, unknown>): Booking {
  return {
    id: String(row.id),
    groupName: String(row.group_name),
    email: String(row.email),
    phone: String(row.phone ?? ""),
    hotelId: String(row.hotel_id),
    hotelName: String(row.hotel_name ?? ""),
    status: row.status as Booking["status"],
    totalCents: Number(row.total_cents),
    roomsTotalCents: Number(row.rooms_total_cents),
    flightTotalCents: Number(row.flight_total_cents),
    passengerCount: Number(row.passenger_count),
    rooms: (row.rooms as Booking["rooms"]) ?? [],
    passengers: (row.passengers as Booking["passengers"]) ?? [],
    ceremonyAttending: row.ceremony_attending == null ? true : Boolean(row.ceremony_attending),
    ceremonyGuestCount: Number(row.ceremony_guest_count ?? 0),
    stripeSessionId: (row.stripe_session_id as string) ?? null,
    createdAt: String(row.created_at),
    paidAt: (row.paid_at as string) ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Public API                                    */
/* -------------------------------------------------------------------------- */

export async function getHotels(): Promise<HotelAvailability[]> {
  if (isSupabaseConfigured) return getHotelsSupabase();
  return computeAvailabilityDemo();
}

export async function createPendingBooking(
  draft: BookingDraft,
  price: PriceBreakdown,
): Promise<{ bookingId: string }> {
  if (!isSupabaseConfigured) return createPendingDemo(draft, price);

  const sb = getSupabaseAdmin()!;
  const { data, error } = await sb.rpc("reserve_booking", {
    p_group_name: draft.contact.groupName,
    p_email: draft.contact.email,
    p_phone: draft.contact.phone,
    p_hotel_id: draft.hotelId,
    p_rooms: price.rooms.map((r) => ({
      room_type_id: r.roomTypeId,
      room_name: r.roomName,
      quantity: r.quantity,
      price_cents: r.unitCents,
    })),
    p_passengers: draft.passengers.map((p) => ({
      first_name: p.firstName,
      last_name: p.lastName,
      date_of_birth: p.dateOfBirth,
    })),
    p_rooms_total: price.roomsTotalCents,
    p_flight_total: price.flightTotalCents,
    p_total: price.totalCents,
    p_passenger_count: price.passengerCount,
    p_hold_minutes: HOLD_DURATION_MINUTES,
  });
  if (error) throw new Error(error.message);
  const bookingId = String(data);
  // Presence a la ceremonie : stockee separement pour ne pas modifier la RPC.
  await sb
    .from("bookings")
    .update({
      ceremony_attending: draft.ceremonyAttending ?? true,
      ceremony_guest_count: draft.ceremonyGuestCount ?? 0,
    })
    .eq("id", bookingId);
  return { bookingId };
}

/* -------------------------------------------------------------------------- */
/*                         RSVP mise des Tephilines                           */
/* -------------------------------------------------------------------------- */

export async function createCeremonyRsvp(
  input: Omit<CeremonyRsvp, "id" | "createdAt">,
): Promise<CeremonyRsvp> {
  const rsvp: CeremonyRsvp = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  if (!isSupabaseConfigured) {
    store().rsvps.push(rsvp);
    return rsvp;
  }
  const sb = getSupabaseAdmin()!;
  const { error } = await sb.from("ceremony_rsvps").insert({
    id: rsvp.id,
    name: rsvp.name,
    email: rsvp.email,
    phone: rsvp.phone,
    attending: rsvp.attending,
    guest_count: rsvp.guestCount,
    source: rsvp.source,
  });
  if (error) throw new Error(error.message);
  return rsvp;
}

export async function listCeremonyRsvps(): Promise<CeremonyRsvp[]> {
  if (!isSupabaseConfigured) {
    return [...store().rsvps].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const sb = getSupabaseAdmin()!;
  const { data, error } = await sb
    .from("ceremony_rsvps")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    name: String(r.name),
    email: String(r.email),
    phone: String(r.phone ?? ""),
    attending: Boolean(r.attending),
    guestCount: Number(r.guest_count ?? 0),
    source: (r.source as CeremonyRsvp["source"]) ?? "ceremony",
    createdAt: String(r.created_at),
  }));
}

export async function attachStripeSession(bookingId: string, sessionId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const b = store().bookings.find((x) => x.id === bookingId);
    if (b) b.stripeSessionId = sessionId;
    return;
  }
  const sb = getSupabaseAdmin()!;
  await sb.from("bookings").update({ stripe_session_id: sessionId }).eq("id", bookingId);
}

/**
 * Confirme une reservation apres paiement.
 * Renvoie `firstConfirmation: true` uniquement lorsque la reservation vient
 * de passer a 'paid' lors de cet appel — ce qui permet aux appelants (webhook
 * Stripe + page de confirmation) d'envoyer les emails une seule fois.
 */
export async function confirmBooking(
  bookingId: string,
): Promise<{ booking: Booking | null; firstConfirmation: boolean }> {
  if (!isSupabaseConfigured) {
    const b = store().bookings.find((x) => x.id === bookingId);
    if (!b) return { booking: null, firstConfirmation: false };
    if (b.status !== "paid") {
      b.status = "paid";
      b.paidAt = new Date().toISOString();
      store().holdExpiry.delete(bookingId);
      return { booking: b, firstConfirmation: true };
    }
    return { booking: b, firstConfirmation: false };
  }
  const sb = getSupabaseAdmin()!;
  // On lit le statut courant AVANT de confirmer pour detecter la transition.
  const existing = await getBookingById(bookingId);
  const alreadyPaid = existing?.status === "paid";
  const { data, error } = await sb.rpc("confirm_booking", { p_booking_id: bookingId });
  if (error) throw new Error(error.message);
  if (!data) {
    return { booking: existing, firstConfirmation: false };
  }
  const row = Array.isArray(data) ? data[0] : data;
  const booking = row ? mapBookingRow(row as Record<string, unknown>) : await getBookingById(bookingId);
  return { booking, firstConfirmation: !alreadyPaid };
}

export async function getBookingById(id: string): Promise<Booking | null> {
  if (!isSupabaseConfigured) {
    return store().bookings.find((x) => x.id === id) ?? null;
  }
  const sb = getSupabaseAdmin()!;
  const { data, error } = await sb.from("booking_details").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapBookingRow(data as Record<string, unknown>) : null;
}

export async function getBookingByStripeSession(sessionId: string): Promise<Booking | null> {
  if (!isSupabaseConfigured) {
    return store().bookings.find((x) => x.stripeSessionId === sessionId) ?? null;
  }
  const sb = getSupabaseAdmin()!;
  const { data, error } = await sb
    .from("booking_details")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapBookingRow(data as Record<string, unknown>) : null;
}

/**
 * Annule une reservation depuis le back-office et libere la place.
 * Une reservation deja payee n'est pas modifiee.
 */
export async function cancelBooking(bookingId: string): Promise<Booking | null> {
  if (!isSupabaseConfigured) {
    const b = store().bookings.find((x) => x.id === bookingId);
    if (!b) return null;
    if (b.status !== "paid") {
      b.status = "cancelled";
      store().holdExpiry.delete(bookingId);
    }
    return b;
  }
  const sb = getSupabaseAdmin()!;
  const { data, error } = await sb.rpc("cancel_booking", { p_booking_id: bookingId });
  if (error) throw new Error(error.message);
  if (!data) return getBookingById(bookingId);
  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapBookingRow(row as Record<string, unknown>) : getBookingById(bookingId);
}

/**
 * Prolonge le hold d'une reservation pending (relance du lien de paiement).
 */
export async function extendBookingHold(bookingId: string, minutes: number): Promise<void> {
  if (!isSupabaseConfigured) {
    store().holdExpiry.set(bookingId, Date.now() + minutes * 60_000);
    return;
  }
  const sb = getSupabaseAdmin()!;
  await sb
    .from("bookings")
    .update({ hold_expires_at: new Date(Date.now() + minutes * 60_000).toISOString() })
    .eq("id", bookingId)
    .eq("status", "pending");
}

export async function listBookings(): Promise<Booking[]> {
  if (!isSupabaseConfigured) {
    return [...store().bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const sb = getSupabaseAdmin()!;
  const { data, error } = await sb
    .from("booking_details")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapBookingRow(r as Record<string, unknown>));
}
