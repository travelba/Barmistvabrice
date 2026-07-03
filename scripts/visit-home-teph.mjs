/**
 * Parcours visiteur desktop : page d'accueil "/" (clic Voir l'invitation)
 * puis /tephilines (reveal, scroll, formulaire RSVP sans envoi).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.VISIT_BASE ?? "https://barmistvabrice.vercel.app";
const OUT = "C:\\Users\\benja\\Projects\\Barmistvabrice\\.shots\\home-teph";
mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log("[ht]", ...a);
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
  // ---------------- Accueil ----------------
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(2000);
  await shot("01-home");
  const cta = page.getByText(/voir l'invitation/i).first();
  await cta.click();
  await page.waitForTimeout(2000);
  log("URL apres CTA accueil:", page.url());
  await shot("02-home-apres-cta");

  // Scroll apres reveal
  await page.mouse.move(960, 540);
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(800);
  const y1 = await page.evaluate(() => window.scrollY);
  log("scrollY apres wheel:", y1);
  await shot("03-home-scroll");

  // ---------------- Tephilines ----------------
  await page.goto(BASE + "/tephilines", { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(2000);
  await shot("04-teph-cover");
  const openBtn = page.locator("#open-invitation");
  if ((await openBtn.count()) > 0) {
    await openBtn.click();
  } else {
    await page.getByText(/voir l'invitation/i).first().click();
  }
  await page.waitForTimeout(2000);
  await shot("05-teph-revealed");

  // Scroll jusqu'au formulaire RSVP
  for (let i = 1; i <= 4; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(600);
  }
  const y2 = await page.evaluate(() => window.scrollY);
  log("teph scrollY:", y2);
  await shot("06-teph-scroll", { fullPage: true });

  // Formulaire RSVP : remplissage sans envoi
  const nameField = page.locator('input[name="name"], #rsvp-name, input[placeholder*="om"]').first();
  if ((await nameField.count()) > 0) {
    await nameField.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await shot("07-teph-form");
  }

  // Liste des elements interactifs
  const clickables = await page.locator("button:visible, a:visible").allTextContents();
  log("clickables:", JSON.stringify(clickables.filter(Boolean).slice(0, 30)));

  log("DONE");
} catch (e) {
  console.error("[ht] ERROR", e);
  await shot("error-state");
} finally {
  await browser.close();
}
