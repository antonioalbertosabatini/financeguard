/**
 * Generate icon/splash sources for @capacitor/assets, Electron, and PWA
 * web icons from public/icon.svg. Requires `sharp`.
 *
 *   npm run icons:generate
 */
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BG = "#0b0b0c";
const SOURCE_SVG = join(root, "public/icon.svg");

const PWA_WEBP_SIZES = [48, 72, 96, 128, 192, 256, 512];

const png = (input, size) =>
  sharp(input, { density: 300 }).resize(size, size).png().toBuffer();

const webp = (input, size) =>
  sharp(input, { density: 300 }).resize(size, size).webp().toBuffer();

const pngFromSvgString = (svg, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

const out = async (name, buf) => {
  const path = join(root, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buf);
  console.log("wrote", name);
};

const sourceSvg = await readFile(SOURCE_SVG);

// Full icon (iOS / legacy / Electron).
await out("assets/icon-only.png", await png(sourceSvg, 1024));

// Adaptive icon Android: foreground in central safe zone (~62%).
await out(
  "assets/icon-foreground.png",
  await png(sourceSvg, Math.round(1024 * 0.62))
);

// Background: solid fill matching the logo backdrop.
const backgroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="${BG}"/></svg>`;
await out("assets/icon-background.png", await pngFromSvgString(backgroundSvg, 1024));

// Splash: logo centered on dark background.
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

// Electron icon (build/ is electron-builder default).
await out("build/icon.png", await png(sourceSvg, 1024));

// PWA raster icons for the web manifest.
for (const size of PWA_WEBP_SIZES) {
  await out(
    `public/icons/icon-${size}.webp`,
    await webp(sourceSvg, size)
  );
}

console.log("Done. Run: npx @capacitor/assets generate --ios --android");
