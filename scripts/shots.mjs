import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3100";
const OUT = "C:\\Users\\benja\\Projects\\Barmistvabrice\\.shots";
mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log("[shots]", ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

async function shot(name, opts = {}) {
  await page.screenshot({ path: `${OUT}\\${name}.png`, ...opts });
  log("saved", name);
}

try {
  // 1. Accueil — hero
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await shot("01-accueil-hero");

  // 1b. Accueil — pleine page
  await shot("02-accueil-full", { fullPage: true });

  // 1c. Ceremonie — interface dediee (Tephilines seul)
  await page.goto(`${BASE}/ceremonie`, { waitUntil: "load" });
  await page.waitForTimeout(2000);
  await shot("09-ceremonie-hero");
  await shot("09b-ceremonie-invitation", { fullPage: true });
  await page.locator("#rsvp").scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.fill("#rsvp-name", "David Cohen");
  await page.fill("#rsvp-email", "david@cohen.fr");
  await page.fill("#rsvp-phone", "+33 6 22 33 44 55");
  await page.waitForTimeout(400);
  await shot("10-ceremonie-rsvp");

  // 2. Reservation — etape Participants (coordonnees + participants)
  await page.goto(`${BASE}/reservation`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.fill("#groupName", "Famille Bechet");
  await page.fill("#email", "famille@bechet.fr");
  await page.fill("#phone", "+33 6 12 34 56 78");
  // Participant 1
  const inputs = page.locator("input:visible");
  await inputs.nth(3).fill("Shon");
  await inputs.nth(4).fill("Bechet");
  await inputs.nth(5).fill("2013-05-10");
  // Participant 2
  await page.getByRole("button", { name: "Ajouter un participant" }).click();
  await page.waitForTimeout(300);
  const inputs2 = page.locator("input:visible");
  await inputs2.nth(6).fill("Sarah");
  await inputs2.nth(7).fill("Bechet");
  await inputs2.nth(8).fill("1980-02-20");
  await page.waitForTimeout(400);
  await shot("03-resa-participants", { fullPage: true });

  // 3. Reservation — choix hotel
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForTimeout(900);
  await shot("04-resa-hotels");

  // selectionne l'hotel Once in Mykonos
  await page.locator('button:has-text("Once")').first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForTimeout(900);

  // 4. Chambres — ajoute 1 chambre de chaque type
  const add = page.getByRole("button", { name: "Ajouter" });
  await add.first().click();
  await page.waitForTimeout(300);
  await add.nth(1).click();
  await page.waitForTimeout(500);
  await shot("05-resa-chambres");

  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForTimeout(900);

  // 5. Recapitulatif
  await shot("07-resa-recap", { fullPage: true });

  // 7. Admin — login + dashboard
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.fill('input[type="password"]', "2026");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForTimeout(1500);
  await shot("08-admin-dashboard", { fullPage: true });

  log("DONE");
} catch (e) {
  console.error("[shots] ERROR", e);
  await shot("error-state");
} finally {
  await browser.close();
}
