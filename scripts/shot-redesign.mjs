import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3100";
const BOOKING = process.argv[2];
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });

async function shot(url, name, full = false) {
  await page.goto(`${BASE}${url}`, { waitUntil: "load" });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
}

// Hero voyage
await shot("/voyage", "rd-voyage-hero");
// Billet teaser
const teaser = page.getByText("Votre embarquement immédiat");
await teaser.scrollIntoViewIfNeeded();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/rd-voyage-billet.png` });

// Ceremonie hero
await shot("/ceremonie", "rd-ceremonie");

// Reservation
await shot("/reservation", "rd-reservation");

// Confirmation (billets + voucher)
if (BOOKING) {
  await page.goto(`${BASE}/confirmation?booking_id=${BOOKING}`, { waitUntil: "load" });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/rd-confirmation.png`, fullPage: true });
}

await browser.close();
console.log("done");
