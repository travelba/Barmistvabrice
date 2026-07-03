/**
 * Simulation visiteur desktop sur la prod : screenshots, test de scroll,
 * erreurs console/réseau. Usage: node scripts/visit-desktop.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.VISIT_BASE ?? "https://barmistvabrice.vercel.app";
const OUT = "C:\\Users\\benja\\Projects\\Barmistvabrice\\.shots\\desktop";
mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log("[visit]", ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
});
page.on("pageerror", (err) => consoleErrors.push("PAGEERROR: " + String(err).slice(0, 300)));
const failedRequests = [];
page.on("requestfailed", (req) => {
  failedRequests.push(`${req.method()} ${req.url()} -> ${req.failure()?.errorText}`);
});
page.on("response", (res) => {
  if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
});

async function shot(name, opts = {}) {
  await page.screenshot({ path: `${OUT}\\${name}.png`, ...opts });
  log("saved", name);
}

async function checkScroll(label) {
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.move(960, 540);
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => window.scrollY);
  const docH = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  log(`${label}: scrollY ${before} -> ${after} (max ${docH})`);
  if (docH > 50 && after === before) log(`!!! SCROLL BLOQUE sur ${label}`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

const pages = [
  ["/", "01-accueil"],
  ["/voyage", "02-voyage"],
  ["/week-end", "03-weekend"],
  ["/ceremonie", "04-ceremonie"],
  ["/tephilines", "05-tephilines"],
  ["/reservation", "06-reservation"],
];

try {
  for (const [path, name] of pages) {
    const t0 = Date.now();
    await page.goto(BASE + path, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(2500);
    log(`${path} charge en ${Date.now() - t0}ms`);
    await shot(name);
    await checkScroll(path);
    await shot(name + "-full", { fullPage: true });
  }

  log("--- Erreurs console ---");
  consoleErrors.forEach((e) => log("CONSOLE:", e));
  log("--- Requetes en echec ---");
  failedRequests.forEach((e) => log("REQ:", e));
  log("DONE");
} catch (e) {
  console.error("[visit] ERROR", e);
  await shot("error-state");
} finally {
  await browser.close();
}
