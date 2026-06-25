import { chromium } from "playwright";
const BASE = "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 320 }, deviceScaleFactor: 2 });
await page.goto(`${BASE}/voyage`, { waitUntil: "load" });
await page.waitForTimeout(1400);
await page.screenshot({ path: "screenshots/header.png" });
await browser.close();
console.log("done");
