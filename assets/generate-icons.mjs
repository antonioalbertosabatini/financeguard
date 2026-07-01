/**
 * Generate icon/splash sources for @capacitor/assets, Electron, and PWA
 * web icons from public/icon.svg. Requires `sharp`.
 */
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BG = "#0b0b0c";
const SOURCE_SVG = join(root, "public/icon.svg");

const ICON_SIZE = 1024;
const SPLASH_SIZE = 2732;
const FOREGROUND_SCALE = 0.62; // Android adaptive icon safe zone
const SPLASH_LOGO_SCALE = 0.42;

const PWA_WEBP_SIZES = [48, 72, 96, 128, 192, 256, 512];

const SOLID_BG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="${BG}"/></svg>`;

const raster = (input, size, format) =>
  sharp(Buffer.isBuffer(input) ? input : Buffer.from(input), { density: 300 })
    .resize(size, size)
    [format]()
    .toBuffer();

const out = async (name, buf) => {
  const filePath = join(root, name);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, buf);
  console.log("wrote", name);
};

const sourceSvg = await readFile(SOURCE_SVG);

const icon1024 = await raster(sourceSvg, ICON_SIZE, "png");
await out("assets/icon-only.png", icon1024);
await out("build/icon.png", icon1024);

await out(
  "assets/icon-foreground.png",
  await raster(sourceSvg, Math.round(ICON_SIZE * FOREGROUND_SCALE), "png")
);

await out("assets/icon-background.png", await raster(SOLID_BG_SVG, ICON_SIZE, "png"));

const splashBase = await raster(SOLID_BG_SVG, SPLASH_SIZE, "png");
const logoSmall = await raster(
  sourceSvg,
  Math.round(SPLASH_SIZE * SPLASH_LOGO_SCALE),
  "png"
);
const splash = await sharp(splashBase)
  .composite([{ input: logoSmall, gravity: "center" }])
  .png()
  .toBuffer();
await out("assets/splash.png", splash);
await out("assets/splash-dark.png", splash);

for (const size of PWA_WEBP_SIZES) {
  await out(`public/icons/icon-${size}.webp`, await raster(sourceSvg, size, "webp"));
}

console.log("Done.");
