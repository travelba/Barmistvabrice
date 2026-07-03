/**
 * Reproduit le bug desktop : molette sur l'ecran de couverture,
 * puis clic "Voir l'invitation" -> ou atterrit le visiteur ?
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.VISIT_BASE ?? "https://barmistvabrice.vercel.app";
const OUT = "C:\\Users\\benja\\Projects\\Barmistvabrice\\.shots\\bug";
mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log("[bug]", ...a);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();

async function shot(name) {
  await page.screenshot({ path: `${OUT}\\${name}.png` });
  log("saved", name);
}

for (const path of ["/voyage", "/", "/tephilines"]) {
  await page.goto(BASE + path, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(2000);

  // Le visiteur donne des coups de molette sur la couverture
  await page.mouse.move(960, 540);
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(400);
  }
  const yBefore = await page.evaluate(() => window.scrollY);
  log(`${path} : scrollY pendant la couverture = ${yBefore} (attendu : 0)`);

  // Puis clique sur "Voir l'invitation"
  await page.locator("#open-invitation").click();
  await page.waitForTimeout(1600);
  const yAfter = await page.evaluate(() => window.scrollY);
  log(`${path} : scrollY apres reveal = ${yAfter}`);
  await shot(`apres-reveal${path.replace(/\//g, "_")}`);
}

await browser.close();
log("DONE");
