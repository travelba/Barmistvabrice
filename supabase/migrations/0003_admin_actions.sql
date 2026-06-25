-- Bar Mitsvah Shon Bechet — actions back-office + holds persistants
-- A executer dans Supabase (SQL editor) ou via le script de migration.
--
-- Objectif :
--  * Une reservation "pending" (paiement non finalise) continue de BLOQUER la
--    chambre et la place avion, sans expiration automatique. La place n'est
--    liberee que par une action explicite de l'agence (annulation).
--  * Ajout d'une fonction cancel_booking() pour liberer une place depuis le back-office.

-- ---------------------------------------------------------------------------
-- Occupation : on compte desormais TOUTES les reservations pending comme
-- "retenues" (held), quelle que soit l'echeance du hold.
-- ---------------------------------------------------------------------------
create or replace function room_occupancy()
returns table(room_type_id text, booked bigint, held bigint)
language sql stable as $$
  select
    br.room_type_id,
    coalesce(sum(br.quantity) filter (where b.status = 'paid'), 0) as booked,
    coalesce(sum(br.quantity) filter (where b.status = 'pending'), 0) as held
  from booking_rooms br
  join bookings b on b.id = br.booking_id
  group by br.room_type_id;
$$;

-- ---------------------------------------------------------------------------
-- Reservation atomique : la disponibilite tient compte de toutes les
-- reservations pending (plus de filtre sur hold_expires_at).
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

  for r in select * from jsonb_array_elements(p_rooms) loop
    perform 1 from room_types where id = (r->>'room_type_id') for update;

    select rt.stock_total - coalesce((
        select sum(br.quantity)
        from booking_rooms br
        join bookings b on b.id = br.booking_id
        where br.room_type_id = rt.id
          and b.status in ('paid', 'pending')
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
-- Annulation depuis le back-office : libere la place (chambre + avion).
-- ---------------------------------------------------------------------------
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
