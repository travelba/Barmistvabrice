alter table whatsapp_identity_pending
  add column if not exists items jsonb not null default '[]'::jsonb;

-- Ajoute une pièce au lot du numéro. Remplace la même pièce déjà présente.
create or replace function append_whatsapp_identity_item(p_phone text, p_item jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  row whatsapp_identity_pending%rowtype;
  base jsonb := '[]'::jsonb;
  kept jsonb := '[]'::jsonb;
  removed jsonb := '[]'::jsonb;
  elem jsonb;
begin
  insert into whatsapp_identity_pending (phone, message_sid, expires_at, items)
  values (p_phone, coalesce(p_item->>'messageSid', 'batch'), now() + interval '2 hours', '[]'::jsonb)
  on conflict (phone) do nothing;

  select * into row from whatsapp_identity_pending where phone = p_phone for update;
  if not found then
    return jsonb_build_object('items', '[]'::jsonb, 'removed', '[]'::jsonb);
  end if;

  base := coalesce(row.items, '[]'::jsonb);
  if base = '[]'::jsonb and row.passenger is not null and row.storage_path is not null then
    base := jsonb_build_array(jsonb_build_object(
      'messageSid', row.message_sid,
      'storagePath', row.storage_path,
      'mimeType', coalesce(row.mime_type, ''),
      'passenger', row.passenger,
      'docKey', upper(regexp_replace(coalesce(row.passenger->>'docNumber', ''), '[^A-Za-z0-9]', '', 'g')),
      'personKey', ''
    ));
  end if;

  for elem in select value from jsonb_array_elements(base)
  loop
    if elem->>'docKey' = p_item->>'docKey'
      or (coalesce(p_item->>'personKey', '') <> '' and elem->>'personKey' = p_item->>'personKey')
    then
      if coalesce(elem->>'storagePath', '') <> '' and elem->>'storagePath' <> p_item->>'storagePath' then
        removed := removed || jsonb_build_array(elem->>'storagePath');
      end if;
      continue;
    end if;
    kept := kept || jsonb_build_array(elem);
  end loop;

  kept := kept || jsonb_build_array(p_item);

  update whatsapp_identity_pending
  set items = kept,
      passenger = null,
      storage_path = null,
      mime_type = null,
      message_sid = coalesce(p_item->>'messageSid', message_sid),
      expires_at = now() + interval '2 hours',
      updated_at = now()
  where phone = p_phone;

  return jsonb_build_object('items', kept, 'removed', removed);
end;
$$;

revoke all on function append_whatsapp_identity_item(text, jsonb) from public, anon, authenticated;
grant execute on function append_whatsapp_identity_item(text, jsonb) to service_role;
