const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function rest(key, label) {
  const res = await fetch(`${url}/rest/v1/hotels?select=id,name,room_types(id)&order=sort_order`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const body = await res.json();
  console.log(`[${label}] status=${res.status}`, Array.isArray(body) ? `${body.length} hotels` : JSON.stringify(body));
  if (Array.isArray(body)) for (const h of body) console.log(`   ${h.id} (${h.room_types.length} chambres)`);
}

await rest(service, "service_role");
if (anon) await rest(anon, "anon (RLS doit bloquer -> 0)");
