-- Bar Mitsvah Shon Bechet — schema initial
-- A executer dans Supabase (SQL editor) ou via `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists hotels (
  id           text primary key,
  name         text not null,
  slug         text not null unique,
  description  text,
  location     text,
  stars        int default 5,
  photos       jsonb default '[]'::jsonb,
  capacity_max int not null,
  sort_order   int default 0,
  created_at   timestamptz default now()
);

create table if not exists room_types (
  id          text primary key,
  hotel_id    text not null references hotels(id) on delete cascade,
  name        text not null,
  capacity    int not null,
  price_cents int not null,
  description text,
  photos      jsonb default '[]'::jsonb,
  stock_total int not null,
  sort_order  int default 0
);

create table if not exists bookings (
  id                 uuid primary key default gen_random_uuid(),
  group_name         text not null,
  email              text not null,
  phone              text,
  hotel_id           text references hotels(id),
  hotel_name         text,
  status             text not null default 'pending', -- pending | paid | cancelled | expired
  rooms_total_cents  int not null default 0,
  flight_total_cents int not null default 0,
  total_cents        int not null default 0,
  passenger_count    int not null default 0,
  stripe_session_id  text,
  hold_expires_at    timestamptz,
  created_at         timestamptz default now(),
  paid_at            timestamptz
);

create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_bookings_hold on bookings(hold_expires_at);
create index if not exists idx_bookings_session on bookings(stripe_session_id);

create table if not exists booking_rooms (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references bookings(id) on delete cascade,
  room_type_id text not null references room_types(id),
  room_name    text,
  quantity     int not null,
  price_cents  int not null
);
create index if not exists idx_booking_rooms_booking on booking_rooms(booking_id);
create index if not exists idx_booking_rooms_type on booking_rooms(room_type_id);

create table if not exists passengers (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id) on delete cascade,
  first_name    text not null,
  last_name     text not null,
  date_of_birth date not null
);
create index if not exists idx_passengers_booking on passengers(booking_id);

create table if not exists settings (
  key   text primary key,
  value jsonb
);

-- ---------------------------------------------------------------------------
-- Securite : RLS active, aucune policy publique.
-- Tout l'acces applicatif passe par la cle service_role (qui contourne RLS).
-- ---------------------------------------------------------------------------
alter table hotels        enable row level security;
alter table room_types    enable row level security;
alter table bookings      enable row level security;
alter table booking_rooms enable row level security;
alter table passengers    enable row level security;
alter table settings      enable row level security;

-- ---------------------------------------------------------------------------
-- Vue agregee pour l'API / l'admin
-- ---------------------------------------------------------------------------
create or replace view booking_details as
select
  b.id, b.group_name, b.email, b.phone, b.hotel_id, b.hotel_name, b.status,
  b.rooms_total_cents, b.flight_total_cents, b.total_cents, b.passenger_count,
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

-- ---------------------------------------------------------------------------
-- Occupation par type de chambre (reservees vs retenues)
-- ---------------------------------------------------------------------------
create or replace function room_occupancy()
returns table(room_type_id text, booked bigint, held bigint)
language sql stable as $$
  select
    br.room_type_id,
    coalesce(sum(br.quantity) filter (where b.status = 'paid'), 0) as booked,
    coalesce(sum(br.quantity) filter (
      where b.status = 'pending' and b.hold_expires_at > now()), 0) as held
  from booking_rooms br
  join bookings b on b.id = br.booking_id
  group by br.room_type_id;
$$;

-- ---------------------------------------------------------------------------
-- Reservation atomique avec verification des places (anti-survente)
-- ---------------------------------------------------------------------------
create or replace function reserve_booking(
  p_group_name      text,
  p_email           text,
  p_phone           text,
  p_hotel_id        text,
  p_rooms           jsonb,
  p_passengers      jsonb,
  p_rooms_total     int,
  p_flight_total    int,
  p_total           int,
  p_passenger_count int,
  p_hold_minutes    int
) returns uuid
language plpgsql as $$
declare
  v_booking_id uuid;
  v_hotel_name text;
  v_available  int;
  r            jsonb;
begin
  select name into v_hotel_name from hotels where id = p_hotel_id;
  if v_hotel_name is null then
    raise exception 'Hôtel introuvable';
  end if;

  -- Verrouille chaque type de chambre concerne et verifie la disponibilite
  for r in select * from jsonb_array_elements(p_rooms) loop
    perform 1 from room_types where id = (r->>'room_type_id') for update;

    select rt.stock_total - coalesce((
        select sum(br.quantity)
        from booking_rooms br
        join bookings b on b.id = br.booking_id
        where br.room_type_id = rt.id
          and (b.status = 'paid' or (b.status = 'pending' and b.hold_expires_at > now()))
      ), 0)
    into v_available
    from room_types rt
    where rt.id = (r->>'room_type_id');

    if v_available is null then
      raise exception 'Type de chambre introuvable: %', (r->>'room_type_id');
    end if;
    if v_available < (r->>'quantity')::int then
      raise exception 'Disponibilité insuffisante pour %', coalesce(r->>'room_name', r->>'room_type_id');
    end if;
  end loop;

  insert into bookings(
    group_name, email, phone, hotel_id, hotel_name, status,
    rooms_total_cents, flight_total_cents, total_cents, passenger_count, hold_expires_at)
  values (
    p_group_name, p_email, p_phone, p_hotel_id, v_hotel_name, 'pending',
    p_rooms_total, p_flight_total, p_total, p_passenger_count,
    now() + make_interval(mins => p_hold_minutes))
  returning id into v_booking_id;

  for r in select * from jsonb_array_elements(p_rooms) loop
    insert into booking_rooms(booking_id, room_type_id, room_name, quantity, price_cents)
    values (v_booking_id, (r->>'room_type_id'), (r->>'room_name'),
            (r->>'quantity')::int, (r->>'price_cents')::int);
  end loop;

  for r in select * from jsonb_array_elements(p_passengers) loop
    insert into passengers(booking_id, first_name, last_name, date_of_birth)
    values (v_booking_id, (r->>'first_name'), (r->>'last_name'), (r->>'date_of_birth')::date);
  end loop;

  return v_booking_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Confirmation d'un paiement reussi
-- ---------------------------------------------------------------------------
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
-- Liberation des holds expires (a appeler periodiquement, ex: cron)
-- ---------------------------------------------------------------------------
create or replace function expire_stale_holds()
returns int
language plpgsql as $$
declare n int;
begin
  update bookings set status = 'expired'
   where status = 'pending' and hold_expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;
