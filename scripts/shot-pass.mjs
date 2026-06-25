import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3100";
const BOOKING = process.argv[2];
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

// Confirmation avec billets generes
await page.goto(`${BASE}/confirmation?booking_id=${BOOKING}`, { waitUntil: "load" });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/confirmation-billets.png`, fullPage: true });

// Teaser billet sur /voyage
await page.goto(`${BASE}/voyage`, { waitUntil: "load" });
await page.waitForTimeout(1200);
const teaser = page.getByText("Votre embarquement immédiat");
await teaser.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/voyage-billet.png` });

await browser.close();
console.log("done");
