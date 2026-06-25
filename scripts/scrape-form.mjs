import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "C:\\Users\\benja\\Projects\\Barmistvabrice\\.scrape\\form";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();

// collecte toutes les URLs d'images chargees (reseau)
const imageUrls = new Set();
page.on("response", (r) => {
  const u = r.url();
  if (/\.(jpe?g|png|webp|avif|gif|svg)(\?|$)/i.test(u)) imageUrls.add(u);
});

async function dump(step) {
  const text = await page.evaluate(() => document.body.innerText);
  const media = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("img").forEach((i) => {
      if (i.currentSrc || i.src) out.push({ type: "img", src: i.currentSrc || i.src, alt: i.alt });
    });
    document.querySelectorAll("*").forEach((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg !== "none" && bg.includes("url(")) {
        const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (m) out.push({ type: "bg", src: m[1] });
      }
    });
    return out;
  });
  writeFileSync(`${OUT}\\step${step}.txt`, text, "utf8");
  writeFileSync(`${OUT}\\step${step}.json`, JSON.stringify(media, null, 2), "utf8");
  await page.screenshot({ path: `${OUT}\\step${step}.png`, fullPage: true });
  console.log(`[form] step${step} text-len=${text.length} media=${media.length}`);
}

async function clickText(txt) {
  const loc = page.locator(`text="${txt}"`).first();
  if (await loc.count()) {
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    await loc.click({ timeout: 4000 }).catch((e) => console.log("click fail", txt, e.message));
    await page.waitForTimeout(1500);
    return true;
  }
  return false;
}

try {
  await page.goto("https://www.bm-shon-bechet.fr/#reponse", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(3000);
  await dump(0);

  // Etape 1 : repondre Oui
  await clickText("Oui");
  await dump("1-oui");

  // Avancer dans les etapes
  for (let i = 1; i <= 6; i++) {
    const ok = await clickText("Suivant");
    if (!ok) {
      console.log("[form] plus de bouton Suivant a l'etape", i);
      break;
    }
    await dump(`next${i}`);
  }

  writeFileSync(`${OUT}\\all-image-urls.json`, JSON.stringify([...imageUrls], null, 2), "utf8");
  console.log("[form] total image urls:", imageUrls.size);
} catch (e) {
  console.error("[form] error", e.message);
  await dump("error");
} finally {
  await browser.close();
}
