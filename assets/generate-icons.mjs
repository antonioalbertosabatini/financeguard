/**
 * Genera le sorgenti icona/splash (scudo) per @capacitor/assets, l'icona
 * Electron e l'icona web, a partire da SVG inline. Usa `sharp` (gia' presente).
 *
 *   node assets/generate-icons.mjs
 *   npx @capacitor/assets generate   # poi distribuisce su iOS/Android
 */
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BG = "#0b0b0c";
const EMERALD = "#34d399";
const EMERALD_DARK = "#059669";

// Scudo centrato in un viewBox 1024. Sagoma classica + check di sicurezza.
function shield(scale = 1, cx = 512, cy = 512) {
  // path costruito attorno a (512,512) con dimensione base ~ 760 di altezza
  return `
    <g transform="translate(${cx} ${cy}) scale(${scale}) translate(-512 -512)">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${EMERALD}"/>
          <stop offset="1" stop-color="${EMERALD_DARK}"/>
        </linearGradient>
      </defs>
      <path d="M512 132 L838 244 V520 C838 716 702 838 512 900 C322 838 186 716 186 520 V244 Z"
            fill="url(#g)"/>
      <path d="M512 188 L786 282 V520 C786 686 672 792 512 846 C352 792 238 686 238 520 V282 Z"
            fill="${BG}" opacity="0.18"/>
      <path d="M412 512 l66 70 138 -150" fill="none" stroke="#ffffff" stroke-width="56"
            stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
}

function svgDoc(inner, bg = "none") {
  const rect =
    bg === "none"
      ? ""
      : `<rect width="1024" height="1024" rx="0" fill="${bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${rect}${inner}</svg>`;
}

const png = (svg, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

const out = async (name, buf) => {
  await writeFile(join(root, name), buf);
  console.log("wrote", name);
};

// Adaptive icon: foreground nella safe zone centrale (~62%).
const foreground = svgDoc(shield(0.62));
// Background: tinta piena.
const background = svgDoc("", BG);
// Icona piena (iOS / legacy): bg scuro + scudo.
const iconOnly = svgDoc(shield(0.82), BG);
// Splash: scudo piccolo centrato su bg scuro (2732x2732 lo fa @capacitor/assets,
// ma forniamo una sorgente 1024 quadrata; verra' centrata).
const splash = svgDoc(shield(0.42), BG);

await out("assets/icon-foreground.png", await png(foreground, 1024));
await out("assets/icon-background.png", await png(background, 1024));
await out("assets/icon-only.png", await png(iconOnly, 1024));
await out("assets/splash.png", await png(splash, 2732));
await out("assets/splash-dark.png", await png(splash, 2732));

// Icona Electron (build/ e' la cartella di default di electron-builder).
await out("build/icon.png", await png(iconOnly, 1024));

// Icona web / PWA (manifest punta a /icon.svg).
await writeFile(join(root, "public/icon.svg"), svgDoc(shield(0.82), BG));
console.log("wrote public/icon.svg");
