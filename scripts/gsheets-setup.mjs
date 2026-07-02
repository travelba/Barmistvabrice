import { readFileSync } from "node:fs";
import { google } from "googleapis";

const keyPath = process.env.GKEY_PATH;
const sheetId = process.env.SHEET_ID;
const creds = JSON.parse(readFileSync(keyPath, "utf8"));

const auth = new google.auth.JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
const tabs = meta.data.sheets.map((s) => s.properties.title);
console.log("Classeur:", meta.data.properties.title);
console.log("Onglets:", tabs.join(", "));

const headers = {
  Inscriptions: [
    "Date", "ID", "Statut", "Groupe", "Email", "Téléphone", "Hôtel",
    "Chambres", "Nb passagers", "Passagers", "Total chambres", "Total vol",
    "Total", "Cérémonie", "Nb participants cérémonie",
  ],
  Tephilines: [
    "Date", "ID", "Nom", "Email", "Téléphone", "Présence", "Nb invités", "Source",
  ],
};

for (const [tab, row] of Object.entries(headers)) {
  if (!tabs.includes(tab)) {
    console.log(`!! Onglet manquant: ${tab}`);
    continue;
  }
  if (process.argv.includes("--reset")) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${tab}!A:Z`,
    });
    console.log(`Donnees effacees: ${tab}`);
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tab}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
  console.log(`En-tetes ecrites: ${tab} (${row.length} colonnes)`);
}

console.log("OK - acces en ecriture confirme.");
