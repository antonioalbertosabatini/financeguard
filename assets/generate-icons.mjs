/**
 * Genera le sorgenti icona/splash per @capacitor/assets, l'icona
 * Electron e i PNG web, a partire da public/icon.svg. Usa `sharp`.
 *
 *   node assets/generate-icons.mjs
 *   npx @capacitor/assets generate --android
 */
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BG = "#0b0b0c";
const SOURCE_SVG = join(root, "public/icon.svg");

const png = (input, size) =>
  sharp(input, { density: 300 }).resize(size, size).png().toBuffer();

const pngFromSvgString = (svg, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

const out = async (name, buf) => {
  const path = join(root, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buf);
  console.log("wrote", name);
};

const sourceSvg = await readFile(SOURCE_SVG);

// Icona piena (iOS / legacy / Electron).
await out("assets/icon-only.png", await png(sourceSvg, 1024));

// Adaptive icon Android: foreground nella safe zone centrale (~62%).
await out(
  "assets/icon-foreground.png",
  await png(sourceSvg, Math.round(1024 * 0.62))
);

// Background: tinta piena coerente con il logo.
const backgroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="${BG}"/></svg>`;
await out("assets/icon-background.png", await pngFromSvgString(backgroundSvg, 1024));

// Splash: logo centrato su sfondo scuro.
const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${BG}"/>
</svg>`;
const splashBase = await pngFromSvgString(splashSvg, 2732);
const logoSmall = await png(sourceSvg, Math.round(2732 * 0.42));
await out(
  "assets/splash.png",
  await sharp(splashBase)
    .composite([{ input: logoSmall, gravity: "center" }])
    .png()
    .toBuffer()
);
await out(
  "assets/splash-dark.png",
  await sharp(splashBase)
    .composite([{ input: logoSmall, gravity: "center" }])
    .png()
    .toBuffer()
);

// Icona Electron (build/ e' la cartella di default di electron-builder).
await out("build/icon.png", await png(sourceSvg, 1024));

console.log("Done. Run: npx @capacitor/assets generate --android");
