// Generateur : transforme les vraies donnees de l'ancien projet (ref-bmsb)
// en seed-data.ts + supabase/seed.sql, et copie les photos locales dans public/hotels.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const REF = "C:\\Users\\benja\\Projects\\ref-bmsb";
const PROJ = "C:\\Users\\benja\\Projects\\Barmistvabrice";
const SRC_IMG = path.join(REF, "img");
const DEST_IMG = path.join(PROJ, "public", "hotels");
mkdirSync(DEST_IMG, { recursive: true });

const NIGHTS = 2;
const data = JSON.parse(readFileSync(path.join(REF, "data", "hotels.json"), "utf8"));

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseCapacity(cap) {
  if (!cap) return 2;
  if (/2\s*adultes?\s*2\s*enfants?/i.test(cap)) return 4;
  const m = cap.match(/(\d+)\s*Personnes?/i);
  return m ? parseInt(m[1], 10) : 2;
}

function parseNightlyEuros(price) {
  const m = price.replace(/\s/g, "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

// Copie une image locale et renvoie le chemin web /hotels/...
function localImage(ref) {
  const file = ref.replace(/^\/?img\//, "");
  const src = path.join(SRC_IMG, file);
  const destName = slugify(file);
  const dest = path.join(DEST_IMG, destName);
  if (existsSync(src)) {
    copyFileSync(src, dest);
    return `/hotels/${destName}`;
  }
  console.warn("[build-seed] image locale introuvable:", file);
  return `/hotels/${destName}`;
}

function mapImage(ref) {
  if (/^https?:\/\//i.test(ref)) return ref; // URL distante : conservee
  return localImage(ref);
}

// Stock par defaut (A CONFIRMER avec le client) : villas uniques = 1, sinon selon capacite
function defaultStock(name, capacity) {
  if (/villa/i.test(name)) return 1;
  if (capacity >= 4) return 3;
  return 6;
}

const HOTEL_META = {
  hotelA: {
    id: "once-mykonos",
    slug: "once-in-mykonos",
    location: "Mykonos, Grèce",
    description:
      "Boutique-hotel de luxe perche au-dessus de la mer Egee, design contemporain et vue panoramique sur Mykonos.",
    hero: ["once.webp"],
  },
  hotelB: {
    id: "santa-marina",
    slug: "santa-marina-mykonos",
    location: "Ornos Bay, Mykonos",
    description:
      "Santa Marina, a Luxury Collection Resort : presqu'ile privee, plage, villas avec piscine et service d'exception.",
    hero: ["AerialandBeachSantaMarina.jpg"],
  },
};

const hotels = [];
let sortHotel = 1;

for (const key of ["hotelB", "hotelA"]) {
  const h = data[key];
  const meta = HOTEL_META[key];
  let sortRoom = 1;
  const roomTypes = h.rooms.map((r) => {
    const capacity = parseCapacity(r.capacity);
    const nightly = parseNightlyEuros(r.price);
    // priceCents = prix PAR NUIT ; le total du sejour (x NIGHTS) est calcule cote serveur.
    const priceCents = nightly * 100;
    const stock = defaultStock(r.name, capacity);
    return {
      id: `${meta.id}-${slugify(r.name)}`.slice(0, 60),
      hotelId: meta.id,
      name: r.name,
      capacity,
      priceCents,
      description: `${r.capacity} — ${nightly} € / nuit (séjour de ${NIGHTS} nuits).`,
      photos: r.images.map(mapImage),
      stockTotal: stock,
      booked: 0,
      held: 0,
      sortOrder: sortRoom++,
    };
  });
  const capacityMax = roomTypes.reduce((a, rt) => a + rt.stockTotal, 0);
  hotels.push({
    id: meta.id,
    name: h.name,
    slug: meta.slug,
    description: meta.description,
    location: meta.location,
    stars: 5,
    photos: meta.hero.map((f) => localImage(f)),
    capacityMax,
    sortOrder: sortHotel++,
    roomTypes,
  });
}

// --- Ecrit src/lib/seed-data.ts ---
const ts = `import type { Hotel } from "./types";

/**
 * Donnees reelles des 2 hotels (Mykonos) importees depuis l'ancien projet.
 * Prix = prix PAR NUIT, en centimes d'euro (total sejour = prix x ${NIGHTS} nuits, calcule cote serveur).
 * Les stocks (places limitees) sont des valeurs par defaut A CONFIRMER avec le client.
 * Genere par scripts/build-seed.mjs.
 */
export const HOTELS_SEED: Hotel[] = ${JSON.stringify(
  hotels.map(({ sortOrder, ...h }) => ({
    ...h,
    roomTypes: h.roomTypes.map(({ sortOrder: _s, ...rt }) => rt),
  })),
  null,
  2,
)};
`;
writeFileSync(path.join(PROJ, "src", "lib", "seed-data.ts"), ts, "utf8");

// --- Ecrit supabase/seed.sql ---
const esc = (s) => String(s).replace(/'/g, "''");
let sql = `-- Donnees reelles des 2 hotels (Mykonos). Genere par scripts/build-seed.mjs.\n-- Prix = prix PAR NUIT en centimes d'euro (total sejour = x ${NIGHTS} nuits, calcule cote serveur). Stocks A CONFIRMER.\n\n`;
sql += "insert into hotels (id, name, slug, description, location, stars, photos, capacity_max, sort_order) values\n";
sql += hotels
  .map(
    (h) =>
      `('${esc(h.id)}', '${esc(h.name)}', '${esc(h.slug)}', '${esc(h.description)}', '${esc(
        h.location,
      )}', ${h.stars}, '${esc(JSON.stringify(h.photos))}'::jsonb, ${h.capacityMax}, ${h.sortOrder})`,
  )
  .join(",\n");
sql += "\non conflict (id) do nothing;\n\n";
sql += "insert into room_types (id, hotel_id, name, capacity, price_cents, description, photos, stock_total, sort_order) values\n";
const rows = [];
for (const h of hotels) {
  for (const rt of h.roomTypes) {
    rows.push(
      `('${esc(rt.id)}', '${esc(rt.hotelId)}', '${esc(rt.name)}', ${rt.capacity}, ${rt.priceCents}, '${esc(
        rt.description,
      )}', '${esc(JSON.stringify(rt.photos))}'::jsonb, ${rt.stockTotal}, ${rt.sortOrder})`,
    );
  }
}
sql += rows.join(",\n");
sql += "\non conflict (id) do nothing;\n";
writeFileSync(path.join(PROJ, "supabase", "seed.sql"), sql, "utf8");

console.log("[build-seed] hotels:", hotels.length);
for (const h of hotels) console.log(`  - ${h.name}: ${h.roomTypes.length} chambres, capacite ${h.capacityMax}`);
console.log("[build-seed] OK -> seed-data.ts + seed.sql + public/hotels");
