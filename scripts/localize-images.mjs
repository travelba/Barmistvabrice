/**
 * Rapatrie les images de chambres hébergées sur media.privateupgrades.com
 * vers public/hotels/, puis remplace les URLs externes par les chemins
 * locaux dans les JSON publics, le seed mémoire et le seed SQL.
 *
 * Idempotent : les fichiers déjà téléchargés sont conservés.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "hotels");
mkdirSync(outDir, { recursive: true });

const FILES = [
  "public/data/hotels.json",
  "public/data/hotels-hebrew.json",
  "src/lib/seed-data.ts",
  "supabase/seed.sql",
];
const URL_RE = /https:\/\/media\.privateupgrades\.com\/[^\s'"()]+\.jpg/g;

// 1. Recenser les URLs uniques.
const urls = new Set();
for (const f of FILES) {
  const txt = readFileSync(join(root, f), "utf8");
  for (const m of txt.match(URL_RE) ?? []) urls.add(m);
}
console.log(`URLs externes uniques : ${urls.size}`);

// 2. Télécharger (nom de fichier = basename, vérifié sans collision).
const mapping = new Map(); // url -> chemin local "/hotels/xxx.jpg"
let downloaded = 0;
let skipped = 0;
for (const url of urls) {
  const name = basename(new URL(url).pathname).toLowerCase();
  const dest = join(outDir, name);
  mapping.set(url, `/hotels/${name}`);
  if (existsSync(dest) && statSync(dest).size > 0) {
    skipped++;
    continue;
  }
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`ECHEC ${res.status} ${url}`);
    process.exitCode = 2;
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) {
    console.error(`FICHIER SUSPECT (${buf.length} o) ${url}`);
    process.exitCode = 2;
    continue;
  }
  writeFileSync(dest, buf);
  downloaded++;
}
console.log(`Téléchargées : ${downloaded}, déjà présentes : ${skipped}`);
if (process.exitCode) {
  console.error("Des téléchargements ont échoué — références non réécrites.");
  process.exit(process.exitCode);
}

// 3. Réécrire les références.
for (const f of FILES) {
  const p = join(root, f);
  let txt = readFileSync(p, "utf8");
  let count = 0;
  txt = txt.replace(URL_RE, (u) => {
    count++;
    return mapping.get(u) ?? u;
  });
  writeFileSync(p, txt);
  console.log(`${f} : ${count} référence(s) réécrite(s)`);
}
console.log("OK");
