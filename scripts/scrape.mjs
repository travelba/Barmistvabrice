import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const URLS = [
  "https://www.bm-shon-bechet.fr/",
  "https://www.bm-shon-bechet.fr/tephilines",
];
const OUT = "C:\\Users\\benja\\Projects\\Barmistvabrice\\.scrape";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();

for (const url of URLS) {
  const slug = url.replace(/[^a-z0-9]+/gi, "_").slice(0, 60);
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(3000);

    // texte visible
    const text = await page.evaluate(() => document.body.innerText);
    writeFileSync(`${OUT}\\${slug}.txt`, text, "utf8");

    // liens de navigation
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a")).map((a) => ({
        text: a.innerText.trim(),
        href: a.href,
      })).filter((l) => l.href && !l.href.startsWith("javascript")),
    );

    // images
    const imgs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("img"))
        .map((i) => ({ src: i.currentSrc || i.src, alt: i.alt, w: i.naturalWidth, h: i.naturalHeight }))
        .filter((i) => i.src),
    );

    writeFileSync(
      `${OUT}\\${slug}.json`,
      JSON.stringify({ url, links, imgs }, null, 2),
      "utf8",
    );

    await page.screenshot({ path: `${OUT}\\${slug}.png`, fullPage: true });
    console.log("[scrape] done", url, "imgs:", imgs.length, "links:", links.length);
  } catch (e) {
    console.error("[scrape] error", url, e.message);
  }
}

await browser.close();
