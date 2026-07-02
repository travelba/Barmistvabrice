/**
 * Reset production data :
 *  - Google Sheets (onglets Inscriptions + Tephilines : en-têtes seuls)
 *  - Base Supabase (réservations + RSVP, hôtels/chambres conservés)
 *  - Génère un nouveau couple ADMIN_PASSWORD / ADMIN_SECRET
 *
 * Usage (depuis la racine du projet, avec .env.local chargé) :
 *   node --env-file=.env.local scripts/reset-production.mjs
 *   node --env-file=.env.local scripts/reset-production.mjs --skip-db
 *   node --env-file=.env.local scripts/reset-production.mjs --skip-sheets
 *
 * Variables requises :
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID  (sauf --skip-sheets)
 *   DATABASE_URL ou NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY  (sauf --skip-db)
 */

import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

const SHEET_HEADERS = {
  Inscriptions: [
    "Date", "ID", "Statut", "Groupe", "Email", "Téléphone", "Hôtel",
    "Chambres", "Nb passagers", "Passagers", "Total chambres", "Total vol",
    "Total", "Cérémonie", "Nb participants cérémonie",
  ],
  Tephilines: [
    "Date", "ID", "Nom", "Email", "Téléphone", "Présence", "Nb invités", "Source",
  ],
};

const args = new Set(process.argv.slice(2));
const skipDb = args.has("--skip-db");
const skipSheets = args.has("--skip-sheets");

function sheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!email || !rawKey || !sheetId) return null;
  const auth = new google.auth.JWT({
    email,
    key: rawKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return { sheets: google.sheets({ version: "v4", auth }), sheetId };
}

async function resetGoogleSheets() {
  const client = sheetsClient();
  if (!client) {
    console.error("!! Google Sheets : variables manquantes (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID)");
    process.exit(1);
  }
  const { sheets, sheetId } = client;

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const tabs = meta.data.sheets.map((s) => s.properties.title);
  console.log(`Classeur : ${meta.data.properties.title}`);

  for (const [tab, headers] of Object.entries(SHEET_HEADERS)) {
    if (!tabs.includes(tab)) {
      console.warn(`!! Onglet manquant : ${tab}`);
      continue;
    }
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${tab}!A:Z`,
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${tab}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers] },
    });
    console.log(`OK Sheets — ${tab} réinitialisé (${headers.length} colonnes)`);
  }
}

async function resetDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("DB : variables Supabase manquantes — exécutez ce SQL dans Supabase si besoin :");
    console.log(`  DELETE FROM passengers;
  DELETE FROM booking_rooms;
  DELETE FROM bookings;
  DELETE FROM ceremony_rsvps;`);
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const delAll = async (table, dateColumn) => {
    const q = supabase.from(table).delete();
    const { error } = dateColumn
      ? await q.gte(dateColumn, "1970-01-01T00:00:00Z")
      : await q.neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(`${table}: ${error.message}`);
  };

  await delAll("passengers");
  await delAll("booking_rooms");
  await delAll("bookings", "created_at");
  await delAll("ceremony_rsvps", "created_at");

  const counts = await Promise.all(
    ["bookings", "ceremony_rsvps"].map(async (table) => {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      if (error) throw error;
      return [table, count ?? 0];
    }),
  );
  console.log("OK DB — réservations supprimées :", Object.fromEntries(counts));
}

function generateAdminCredentials() {
  const password = `BmS-${randomBytes(4).toString("hex")}`;
  const secret = randomBytes(16).toString("hex");
  const token = createHash("sha256").update(`${password}::${secret}`).digest("hex");
  return { password, secret, token };
}

async function main() {
  console.log("=== Reset production Barmitsvabrice ===\n");

  if (!skipSheets) {
    await resetGoogleSheets();
  } else {
    console.log("Sheets : ignoré (--skip-sheets)");
  }

  if (!skipDb) {
    await resetDatabase();
  } else {
    console.log("DB : ignorée (--skip-db)");
  }

  const admin = generateAdminCredentials();
  console.log("\n=== Nouveau code admin (à mettre à jour sur Vercel) ===");
  console.log(`ADMIN_PASSWORD="${admin.password}"`);
  console.log(`ADMIN_SECRET="${admin.secret}"`);
  console.log("\nAprès mise à jour des variables sur Vercel, reconnectez-vous sur /admin/login");
  console.log("(les sessions existantes avec l'ancien cookie seront invalidées).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
