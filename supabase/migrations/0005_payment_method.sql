-- Mode de paiement : stripe (carte) | bank_transfer (virement) | null (inconnu / non payé)

alter table bookings
  add column if not exists payment_method text;

-- Recree la vue pour exposer payment_method (create or replace ne peut pas
-- inserer une colonne au milieu).
drop view if exists booking_details cascade;
create view booking_details as
select
  b.id, b.group_name, b.email, b.phone, b.hotel_id, b.hotel_name, b.status,
  b.rooms_total_cents, b.flight_total_cents, b.total_cents, b.passenger_count,
  b.ceremony_attending, b.ceremony_guest_count,
  b.stripe_session_id, b.payment_method, b.created_at, b.paid_at,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'roomTypeId', br.room_type_id, 'roomName', br.room_name,
      'quantity', br.quantity, 'priceCents', br.price_cents))
    from booking_rooms br where br.booking_id = b.id), '[]'::jsonb) as rooms,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'firstName', p.first_name, 'lastName', p.last_name,
      'dateOfBirth', to_char(p.date_of_birth, 'YYYY-MM-DD')))
    from passengers p where p.booking_id = b.id), '[]'::jsonb) as passengers
from bookings b;

-- Recree les fonctions tombees avec le drop cascade.
create or replace function confirm_booking(p_booking_id uuid)
returns setof booking_details
language plpgsql as $$
begin
  update bookings
     set status = 'paid', paid_at = now(), hold_expires_at = null
   where id = p_booking_id and status <> 'paid';
  return query select * from booking_details where id = p_booking_id;
end;
$$;

create or replace function cancel_booking(p_booking_id uuid)
returns setof booking_details
language plpgsql as $$
begin
  update bookings
     set status = 'cancelled', hold_expires_at = null
   where id = p_booking_id and status <> 'paid';
  return query select * from booking_details where id = p_booking_id;
end;
$$;
