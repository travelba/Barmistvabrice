/**
 * Reproduction du scenario client : 3 passagers -> chambre de 2 personnes.
 * Verifie que la selection est possible et que "Continuer" mene au recap.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.VISIT_BASE ?? "https://www.bm-shon-bechet.fr";
const OUT = "C:\\Users\\benja\\Projects\\Barmistvabrice\\.shots\\3pax";
mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log("[3pax]", ...a);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
page.on("pageerror", (err) => log("PAGEERROR:", String(err).slice(0, 300)));
page.on("console", (m) => {
  if (m.type() === "error") log("CONSOLE:", m.text().slice(0, 200));
});

async function shot(name, opts = {}) {
  await page.screenshot({ path: `${OUT}\\${name}.png`, ...opts });
  log("saved", name);
}

try {
  await page.goto(BASE + "/reservation", { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(2500);
  log("URL:", page.url());

  // --- Etape 1 : coordonnees + 3 participants ---
  await page.fill("#groupName", "Test Trois Passagers");
  await page.fill("#email", "test3pax@exemple.fr");
  await page.fill("#phone", "0612345678");

  // Ajoute 2 participants supplementaires (1 present par defaut)
  const addBtn = page.getByRole("button", { name: /ajouter un participant|participant/i }).first();
  await addBtn.click();
  await page.waitForTimeout(300);
  await addBtn.click();
  await page.waitForTimeout(300);

  // Remplit prenom/nom/date pour chaque carte participant
  const names = [
    ["Jean", "Test", "1980-03-10"],
    ["Marie", "Test", "1982-06-21"],
    ["Paul", "Test", "2010-09-05"],
  ];
  const cards = page.locator("div.card.rounded-2xl");
  const cardCount = await cards.count();
  log("cartes participants:", cardCount);
  for (let i = 0; i < 3; i++) {
    const inputs = cards.nth(i).locator("input");
    await inputs.nth(0).fill(names[i][0]);
    await inputs.nth(1).fill(names[i][1]);
    await inputs.nth(2).fill(names[i][2]);
  }
  await shot("01-participants", { fullPage: true });

  const cont = () => page.getByRole("button", { name: /continuer/i }).first();
  log("Continuer (participants) actif:", await cont().isEnabled());
  await cont().click();
  await page.waitForTimeout(1500);

  // --- Etape 2 : hotel ---
  await shot("02-hotel", { fullPage: true });
  if (!(await cont().isEnabled())) {
    await page.locator('button:has-text("Santa")').first().click();
    await page.waitForTimeout(500);
  }
  log("Continuer (hotel) actif:", await cont().isEnabled());
  await cont().click();
  await page.waitForTimeout(1500);

  // --- Etape 3 : chambres — on vise la chambre de 2 personnes ---
  await shot("03-chambres-avant", { fullPage: true });
  const roomCard = page
    .locator("div")
    .filter({ has: page.locator('h3:has-text("Standard Room Limited")') })
    .locator('button[aria-label]:has(svg)')
    .last();

  // Plus robuste : trouver la carte par son titre puis son bouton +
  const card = page.locator("div.card", {
    has: page.locator('h3:text-is("Standard Room Limited")'),
  });
  log("carte Standard Room Limited trouvee:", await card.count());
  const plusBtn = card.getByRole("button").last();
  log("bouton + actif:", await plusBtn.isEnabled());
  await plusBtn.click();
  await page.waitForTimeout(600);
  await shot("04-chambre2-selectionnee", { fullPage: true });

  const contEnabled = await cont().isEnabled();
  log("Continuer (chambres, 3 passagers + 1 chambre de 2) actif:", contEnabled);

  if (contEnabled) {
    await cont().click();
    await page.waitForTimeout(2000);
    await shot("05-recap", { fullPage: true });
    log("URL apres continuer:", page.url());
    log("RESULT: OK — chambre de 2 acceptee avec 3 passagers, recap atteint");
  } else {
    // Cherche un eventuel message de blocage affiche
    const body = await page.locator("main").innerText();
    log("RESULT: BLOQUE — Continuer desactive. Texte etape:", body.slice(0, 800));
  }

  log("DONE");
} catch (e) {
  console.error("[3pax] ERROR", e);
  await shot("error-state", { fullPage: true });
} finally {
  await browser.close();
}
