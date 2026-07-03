/**
 * Test desktop de la fiche "Détails" hôtel / avion sur /voyage :
 * reveal, ouverture fiche, scroll interne, bouton Réserver, fermeture.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.VISIT_BASE ?? "https://barmistvabrice.vercel.app";
const OUT = "C:\\Users\\benja\\Projects\\Barmistvabrice\\.shots\\detail";
mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log("[detail]", ...a);
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

  // Etape visiteur 1 : ouvrir l'invitation
  await page.locator("#open-invitation").click();
  await page.waitForTimeout(1500);

  // Etape 2 : aller aux hotels et ouvrir la fiche
  const detailBtns = page.locator("button.hotel-detail-button");
  await detailBtns.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await detailBtns.first().click();
  await page.waitForTimeout(1500);
  await shot("01-detail-ouvert");

  // Scroll molette dans la fiche (comportement visiteur desktop)
  const scrollInfo = async () =>
    page.evaluate(() => {
      const el = document.querySelector(".hotel-overlay.show");
      return el
        ? { top: el.scrollTop, max: el.scrollHeight - el.clientHeight, winY: window.scrollY }
        : null;
    });
  log("avant scroll:", JSON.stringify(await scrollInfo()));
  await page.mouse.move(960, 540);
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(800);
  log("apres wheel 900:", JSON.stringify(await scrollInfo()));
  await shot("02-detail-scroll1");
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(800);
  log("apres wheel 2400:", JSON.stringify(await scrollInfo()));
  await shot("03-detail-scroll2");

  // Bouton Reserver
  const reserve = page.getByRole("button", { name: /réserver/i });
  const nReserve = await reserve.count();
  log("boutons Reserver trouves:", nReserve);
  if (nReserve > 0 && (await reserve.first().isVisible())) {
    await shot("04-bouton-reserver");
    await reserve.first().click();
    await page.waitForTimeout(4000);
    log("URL apres clic Reserver:", page.url());
    await shot("05-apres-reserver");
  } else {
    // Fermer la fiche
    await page.locator("#close-hotel").click();
    await page.waitForTimeout(1000);
    log("apres fermeture, scrollY:", await page.evaluate(() => window.scrollY));
    await shot("06-apres-fermeture");
  }

  log("DONE");
} catch (e) {
  console.error("[detail] ERROR", e);
  await shot("error-state");
} finally {
  await browser.close();
}
