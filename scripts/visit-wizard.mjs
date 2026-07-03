/**
 * Parcours visiteur desktop complet : /voyage -> fiche hotel -> Réserver
 * -> tunnel de reservation (participants, hotel, chambres, recap).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.VISIT_BASE ?? "https://barmistvabrice.vercel.app";
const OUT = "C:\\Users\\benja\\Projects\\Barmistvabrice\\.shots\\wizard";
mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log("[wizard]", ...a);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
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
  await page.goto(BASE + "/voyage", { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.locator("#open-invitation").click();
  await page.waitForTimeout(1200);

  const detailBtns = page.locator("button.hotel-detail-button");
  await detailBtns.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await detailBtns.first().click();
  await page.waitForTimeout(1200);

  // Clic sur le lien Reserver
  const reserve = page.locator("a.hotel-reserve-button");
  log("lien Reserver present:", await reserve.count());
  await reserve.scrollIntoViewIfNeeded();
  await reserve.click();
  await page.waitForLoadState("load");
  await page.waitForTimeout(2500);
  log("URL:", page.url());
  await shot("01-wizard-arrivee", { fullPage: true });

  // Etape participants
  await page.fill("#groupName", "Test Visiteur");
  await page.fill("#email", "test@visiteur.fr");
  await page.fill("#phone", "0612345678");
  const inputs = page.locator("input:visible");
  const n = await inputs.count();
  log("inputs visibles:", n);
  // participant 1 (prenom, nom, date)
  await inputs.nth(3).fill("Jean");
  await inputs.nth(4).fill("Test");
  await inputs.nth(5).fill("1985-04-12");
  await page.waitForTimeout(400);
  await shot("02-participants");

  await page.getByRole("button", { name: /continuer/i }).click();
  await page.waitForTimeout(1200);
  await shot("03-hotel", { fullPage: true });

  // L'hotel devrait etre pre-selectionne via query param
  const cont = page.getByRole("button", { name: /continuer/i });
  const contEnabled = await cont.isEnabled();
  log("Continuer actif sur etape hotel:", contEnabled);
  if (!contEnabled) {
    await page.locator('button:has-text("Santa")').first().click();
    await page.waitForTimeout(500);
  }
  await cont.click();
  await page.waitForTimeout(1200);
  await shot("04-chambres", { fullPage: true });

  // Ajoute une chambre si necessaire puis continue
  const cont2 = page.getByRole("button", { name: /continuer/i });
  if (!(await cont2.isEnabled())) {
    await page.getByRole("button", { name: /ajouter/i }).first().click();
    await page.waitForTimeout(500);
  }
  await shot("05-chambres-choisies");
  await cont2.click();
  await page.waitForTimeout(1500);
  await shot("06-recap", { fullPage: true });
  log("URL finale:", page.url());

  log("DONE");
} catch (e) {
  console.error("[wizard] ERROR", e);
  await shot("error-state", { fullPage: true });
} finally {
  await browser.close();
}
