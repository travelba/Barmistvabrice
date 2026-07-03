/**
 * Parcours visiteur desktop complet : ouverture invitation, navigation
 * dans les cartes, tentative de reservation. Screenshots a chaque etape.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.VISIT_BASE ?? "https://barmistvabrice.vercel.app";
const OUT = "C:\\Users\\benja\\Projects\\Barmistvabrice\\.shots\\flow";
mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log("[flow]", ...a);
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
  await shot("01-cover");

  // Clic sur "Voir l'invitation"
  await page.getByText(/voir l'invitation/i).first().click();
  await page.waitForTimeout(1500);
  await shot("02-apres-clic");
  await page.waitForTimeout(2500);
  await shot("03-apres-clic-4s");

  // Scroll dans l'invitation
  for (let i = 1; i <= 5; i++) {
    await page.mouse.move(960, 540);
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(900);
    const y = await page.evaluate(() => window.scrollY);
    log(`scroll ${i}: scrollY=${y}`);
    await shot(`04-scroll-${i}`);
  }

  // Etat des elements interactifs visibles
  const buttons = await page.locator("button:visible, a:visible").allTextContents();
  log("elements cliquables:", JSON.stringify(buttons.filter(Boolean).slice(0, 30)));

  log("DONE");
} catch (e) {
  console.error("[flow] ERROR", e);
  await shot("error-state");
} finally {
  await browser.close();
}
