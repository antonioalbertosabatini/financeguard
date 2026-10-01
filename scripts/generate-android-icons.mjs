#!/usr/bin/env node
/**
 * Generate Android VectorDrawables (and a Kotlin lookup table) from the
 * Lucide icons used by the web app, so the native Quick Add dialog shows
 * the same icons as the web UI.
 *
 * Icon keys come from the ICON_MAPs in the category/account icon components,
 * plus the UI icons used by the dialog itself.
 *
 * Usage: npm run icons:android
 */
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as lucide from "lucide-react";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ANDROID_MAIN = join(ROOT, "android", "app", "src", "main");
const DRAWABLE_DIR = join(ANDROID_MAIN, "res", "drawable");
const KOTLIN_FILE = join(
  ANDROID_MAIN,
  "java",
  "app",
  "financeguard",
  "quickadd",
  "LucideIcons.kt"
);
const ICON_MAP_SOURCES = [
  "components/categories/category-icon.tsx",
  "components/accounts/account-icon.tsx",
];
const UI_ICONS = {
  circle: "Circle",
  "trending-down": "TrendingDown",
  "trending-up": "TrendingUp",
  euro: "Euro",
  tags: "Tags",
  wallet: "Wallet",
  "circle-plus": "CirclePlus",
  x: "X",
  "chevron-down": "ChevronDown",
  check: "Check",
  lock: "Lock",
  info: "Info",
  "circle-alert": "CircleAlert",
  "arrow-left-right": "ArrowLeftRight",
};

function fail(message) {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

function readIconMap(relativePath) {
  const source = readFileSync(join(ROOT, relativePath), "utf8");
  const block = source.match(/const ICON_MAP[^{]*\{([\s\S]*?)\n\};/);
  if (!block) fail(`ICON_MAP not found in ${relativePath}`);
  const entries = {};
  for (const line of block[1].split("\n")) {
    const match = line.match(/^\s*(?:"([^"]+)"|([A-Za-z0-9_]+)|\[[A-Z_]+\]):\s*([A-Za-z0-9]+),?\s*$/);
    if (!match) continue;
    const key = match[1] ?? match[2] ?? "circle";
    entries[key] = match[3];
  }
  return entries;
}

function collectIcons() {
  const icons = { ...UI_ICONS };
  for (const path of ICON_MAP_SOURCES) {
    for (const [key, component] of Object.entries(readIconMap(path))) {
      if (icons[key] && icons[key] !== component) {
        fail(`icon key "${key}" maps to both ${icons[key]} and ${component}`);
      }
      icons[key] = component;
    }
  }
  return icons;
}

const fmt = (n) => {
  const rounded = Math.round(n * 1000) / 1000;
  return Object.is(rounded, -0) ? "0" : String(rounded);
};

/**
 * Re-serialize SVG path data with explicit separators. Arc flags may be
 * written without separators ("a2 2 0 012 2"), which older Android path
 * parsers mis-read.
 */
function normalizePath(d) {
  const ARGS = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  const out = [];
  let i = 0;
  let command = null;

  const skip = () => {
    while (i < d.length && /[\s,]/.test(d[i])) i++;
  };
  const readNumber = () => {
    skip();
    const match = d.slice(i).match(/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
    if (!match) fail(`bad path data near "${d.slice(i, i + 12)}" in "${d}"`);
    i += match[0].length;
    return Number(match[0]);
  };
  const readFlag = () => {
    skip();
    const flag = d[i];
    if (flag !== "0" && flag !== "1") fail(`bad arc flag in "${d}"`);
    i++;
    return Number(flag);
  };

  while (true) {
    skip();
    if (i >= d.length) break;
    if (/[a-zA-Z]/.test(d[i])) {
      command = d[i++];
    } else if (!command) {
      fail(`path data must start with a command: "${d}"`);
    }
    const count = ARGS[command.toLowerCase()];
    if (count === undefined) fail(`unsupported path command "${command}"`);
    if (count === 0) {
      out.push(command);
      continue;
    }
    const args = [];
    for (let n = 0; n < count; n++) {
      args.push(command.toLowerCase() === "a" && (n === 3 || n === 4) ? readFlag() : readNumber());
    }
    out.push(`${command}${args.map(fmt).join(" ")}`);
    // Implicit repeats after a moveto are linetos.
    if (command === "m") command = "l";
    else if (command === "M") command = "L";
  }
  return out.join(" ");
}

function attrs(raw) {
  const result = {};
  for (const [, name, value] of raw.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
    result[name] = value;
  }
  return result;
}

function points(raw) {
  const nums = raw.trim().split(/[\s,]+/).map(Number);
  const pairs = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pairs.push([nums[i], nums[i + 1]]);
  return pairs;
}

function ellipsePath(cx, cy, rx, ry) {
  return [
    `M${fmt(cx - rx)} ${fmt(cy)}`,
    `a${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(rx * 2)} 0`,
    `a${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(-rx * 2)} 0`,
    "z",
  ].join(" ");
}

function rectPath(a) {
  const x = Number(a.x ?? 0);
  const y = Number(a.y ?? 0);
  const w = Number(a.width);
  const h = Number(a.height);
  let rx = a.rx !== undefined ? Number(a.rx) : a.ry !== undefined ? Number(a.ry) : 0;
  let ry = a.ry !== undefined ? Number(a.ry) : rx;
  rx = Math.min(rx, w / 2);
  ry = Math.min(ry, h / 2);
  if (!rx || !ry) {
    return `M${fmt(x)} ${fmt(y)} h${fmt(w)} v${fmt(h)} h${fmt(-w)} z`;
  }
  return [
    `M${fmt(x + rx)} ${fmt(y)}`,
    `h${fmt(w - 2 * rx)}`,
    `a${fmt(rx)} ${fmt(ry)} 0 0 1 ${fmt(rx)} ${fmt(ry)}`,
    `v${fmt(h - 2 * ry)}`,
    `a${fmt(rx)} ${fmt(ry)} 0 0 1 ${fmt(-rx)} ${fmt(ry)}`,
    `h${fmt(-(w - 2 * rx))}`,
    `a${fmt(rx)} ${fmt(ry)} 0 0 1 ${fmt(-rx)} ${fmt(-ry)}`,
    `v${fmt(-(h - 2 * ry))}`,
    `a${fmt(rx)} ${fmt(ry)} 0 0 1 ${fmt(rx)} ${fmt(-ry)}`,
    "z",
  ].join(" ");
}

function elementToPath(tag, a) {
  switch (tag) {
    case "path":
      return normalizePath(a.d);
    case "circle":
      return ellipsePath(Number(a.cx ?? 0), Number(a.cy ?? 0), Number(a.r), Number(a.r));
    case "ellipse":
      return ellipsePath(Number(a.cx ?? 0), Number(a.cy ?? 0), Number(a.rx), Number(a.ry));
    case "rect":
      return rectPath(a);
    case "line":
      return `M${fmt(Number(a.x1))} ${fmt(Number(a.y1))} L${fmt(Number(a.x2))} ${fmt(Number(a.y2))}`;
    case "polyline":
    case "polygon": {
      const [first, ...rest] = points(a.points);
      const body = [`M${fmt(first[0])} ${fmt(first[1])}`, ...rest.map(([x, y]) => `L${fmt(x)} ${fmt(y)}`)];
      if (tag === "polygon") body.push("z");
      return body.join(" ");
    }
    default:
      fail(`unsupported SVG element <${tag}>`);
  }
}

function iconToVector(key, componentName) {
  const Component = lucide[componentName];
  if (!Component) fail(`lucide-react has no icon "${componentName}" (key "${key}")`);
  const svg = renderToStaticMarkup(createElement(Component));
  const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const paths = [];
  for (const [, tag, raw] of inner.matchAll(/<([a-z]+)([^>]*?)\/?>/g)) {
    paths.push(elementToPath(tag, attrs(raw)));
  }
  if (paths.length === 0) fail(`icon "${componentName}" rendered no shapes`);

  const body = paths
    .map(
      (d) => `    <path
        android:pathData="${d}"
        android:fillColor="#00000000"
        android:strokeColor="#FF000000"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/generate-android-icons.mjs from lucide-react (${componentName}). Do not edit. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
${body}
</vector>
`;
}

const resourceName = (key) => `lucide_${key.replace(/-/g, "_")}`;

function main() {
  const icons = collectIcons();
  const keys = Object.keys(icons).sort();
  mkdirSync(DRAWABLE_DIR, { recursive: true });

  for (const file of readdirSync(DRAWABLE_DIR)) {
    if (file.startsWith("lucide_") && file.endsWith(".xml")) {
      unlinkSync(join(DRAWABLE_DIR, file));
    }
  }
  for (const key of keys) {
    writeFileSync(join(DRAWABLE_DIR, `${resourceName(key)}.xml`), iconToVector(key, icons[key]));
  }

  const entries = keys.map((key) => `        "${key}" to R.drawable.${resourceName(key)},`).join("\n");
  writeFileSync(
    KOTLIN_FILE,
    `// Generated by scripts/generate-android-icons.mjs. Do not edit.
package app.financeguard.quickadd

import app.financeguard.R

internal object LucideIcons {
    private val icons: Map<String, Int> = mapOf(
${entries}
    )

    fun resolve(name: String?, fallback: String): Int =
        icons[name] ?: icons.getValue(fallback)
}
`
  );

  console.log(`Generated ${keys.length} Lucide icons into ${DRAWABLE_DIR}`);
}

main();
