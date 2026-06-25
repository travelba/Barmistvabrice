-- Bar Mitsvah Shon Bechet — mise des Tephilines (RSVP) + presence ceremonie sur les reservations
-- A executer apres 0001_init.sql.

-- ---------------------------------------------------------------------------
-- Presence a la ceremonie sur les reservations de voyage
-- ---------------------------------------------------------------------------
alter table bookings
  add column if not exists ceremony_attending   boolean not null default true,
  add column if not exists ceremony_guest_count int     not null default 0;

-- Vue agregee mise a jour (inclut les champs ceremonie).
-- drop cascade : `create or replace view` ne sait pas inserer des colonnes au
-- milieu d'une vue existante. On supprime la vue (et confirm_booking qui en
-- depend) puis on recree les deux.
drop view if exists booking_details cascade;
create view booking_details as
select
  b.id, b.group_name, b.email, b.phone, b.hotel_id, b.hotel_name, b.status,
  b.rooms_total_cents, b.flight_total_cents, b.total_cents, b.passenger_count,
  b.ceremony_attending, b.ceremony_guest_count,
  b.stripe_session_id, b.created_at, b.paid_at,
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

-- confirm_booking depend de booking_details (supprime par le drop cascade) : on la recree.
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

-- ---------------------------------------------------------------------------
-- RSVP a la mise des Tephilines (lien "ceremonie" seul)
-- ---------------------------------------------------------------------------
create table if not exists ceremony_rsvps (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text,
  attending   boolean not null default true,
  guest_count int not null default 1,
  source      text not null default 'ceremony', -- ceremony | voyage
  created_at  timestamptz default now()
);
create index if not exists idx_ceremony_rsvps_created on ceremony_rsvps(created_at);

-- RLS active, acces applicatif via service_role uniquement (comme le reste du schema).
alter table ceremony_rsvps enable row level security;
