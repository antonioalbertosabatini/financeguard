#!/usr/bin/env node
/**
 * Build release artifacts (APK debug + macOS DMG arm64)
 * and copy them into releases/.
 *
 * Usage: npm run release -- v2.3.6
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const VERSION_FILE = join(ROOT, "releases", "VERSION");
const VERSION_RE = /^v(\d+)\.(\d+)\.(\d+)$/;

function fail(message) {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

function parseVersion(raw) {
  const match = VERSION_RE.exec(raw.trim());
  if (!match) {
    fail(
      `Invalid version "${raw}". Expected format vx.x.x (e.g. v2.3.6).`
    );
  }
  return {
    tag: match[0],
    numeric: `${match[1]}.${match[2]}.${match[3]}`,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareSemver(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function toVersionCode({ major, minor, patch }) {
  if (minor > 99 || patch > 99) {
    fail(
      `minor and patch must be ≤ 99 for Android versionCode (got ${major}.${minor}.${patch}).`
    );
  }
  return major * 10000 + minor * 100 + patch;
}

function readLastVersion() {
  if (!existsSync(VERSION_FILE)) {
    return parseVersion("v0.0.0");
  }
  const raw = readFileSync(VERSION_FILE, "utf8").trim();
  if (!raw) return parseVersion("v0.0.0");
  return parseVersion(raw);
}

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(" ")}\n`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    ...options,
  });
  if (result.error) {
    fail(result.error.message);
  }
  if (result.status !== 0) {
    fail(`Command failed with exit code ${result.status}: ${command} ${args.join(" ")}`);
  }
}

function updatePackageJson(numeric) {
  const path = join(ROOT, "package.json");
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  pkg.version = numeric;
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
}

function updateAppVersionTs(tag) {
  const path = join(ROOT, "lib", "app-version.ts");
  writeFileSync(
    path,
    `/** App display version. Updated by \`npm run release\`. */\nexport const APP_VERSION = "${tag}";\n`
  );
}

function updateAndroidGradle(numeric, versionCode) {
  const path = join(ROOT, "android", "app", "build.gradle");
  let content = readFileSync(path, "utf8");
  if (!/versionCode\s+\d+/.test(content) || !/versionName\s+"[^"]+"/.test(content)) {
    fail("Could not find versionCode/versionName in android/app/build.gradle");
  }
  content = content.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  content = content.replace(/versionName\s+"[^"]+"/, `versionName "${numeric}"`);
  writeFileSync(path, content);
}

function updateIosPbxproj(numeric, versionCode) {
  const path = join(ROOT, "ios", "App", "App.xcodeproj", "project.pbxproj");
  let content = readFileSync(path, "utf8");
  if (
    !/CURRENT_PROJECT_VERSION = [^;]+;/.test(content) ||
    !/MARKETING_VERSION = [^;]+;/.test(content)
  ) {
    fail("Could not find version fields in iOS project.pbxproj");
  }
  content = content.replace(
    /CURRENT_PROJECT_VERSION = [^;]+;/g,
    `CURRENT_PROJECT_VERSION = ${versionCode};`
  );
  content = content.replace(
    /MARKETING_VERSION = [^;]+;/g,
    `MARKETING_VERSION = ${numeric};`
  );
  writeFileSync(path, content);
}

function clearReleaseArtifacts() {
  const releasesDir = join(ROOT, "releases");
  mkdirSync(releasesDir, { recursive: true });
  for (const name of readdirSync(releasesDir)) {
    if (name === "VERSION") continue;
    unlinkSync(join(releasesDir, name));
  }
}

function findArtifact(dir, predicate) {
  if (!existsSync(dir)) return null;
  const matches = readdirSync(dir).filter(predicate);
  if (matches.length === 0) return null;
  return join(dir, matches[0]);
}

function copyArtifacts(tag) {
  const releasesDir = join(ROOT, "releases");
  clearReleaseArtifacts();

  const apkSrc = join(
    ROOT,
    "android",
    "app",
    "build",
    "outputs",
    "apk",
    "debug",
    "app-debug.apk"
  );
  if (!existsSync(apkSrc)) {
    fail(`APK not found at ${apkSrc}`);
  }

  const electronDir = join(ROOT, "dist-electron");
  const dmgSrc = findArtifact(
    electronDir,
    (name) => name.endsWith(".dmg") && !name.includes("blockmap")
  );

  if (!dmgSrc) fail(`DMG not found in ${electronDir}`);

  const apkDest = join(releasesDir, `FinanceGuard-${tag}.apk`);
  const dmgDest = join(releasesDir, `FinanceGuard-${tag}-arm64.dmg`);

  copyFileSync(apkSrc, apkDest);
  copyFileSync(dmgSrc, dmgDest);
  writeFileSync(VERSION_FILE, `${tag}\n`);

  console.log("\nRelease artifacts:");
  console.log(`  ${apkDest}`);
  console.log(`  ${dmgDest}`);
  console.log(`  ${VERSION_FILE}`);
}

function main() {
  const rawArg = process.argv[2];
  if (!rawArg) {
    fail("Missing version. Usage: npm run release -- v2.3.6");
  }

  const next = parseVersion(rawArg);
  const last = readLastVersion();
  if (compareSemver(next, last) < 0) {
    fail(
      `Version ${next.tag} is lower than the previous release ${last.tag}.`
    );
  }

  const versionCode = toVersionCode(next);
  console.log(
    `Releasing ${next.tag} (numeric ${next.numeric}, versionCode ${versionCode})…`
  );

  updatePackageJson(next.numeric);
  updateAppVersionTs(next.tag);
  updateAndroidGradle(next.numeric, versionCode);
  updateIosPbxproj(next.numeric, versionCode);

  run("npx", ["next", "build"]);
  run("npx", ["cap", "sync", "android"]);
  run(
    process.platform === "win32" ? "gradlew.bat" : "./gradlew",
    ["assembleDebug"],
    { cwd: join(ROOT, "android") }
  );
  run("npx", ["electron-builder", "--mac", "--arm64"]);

  copyArtifacts(next.tag);
  console.log(`\nDone. Released ${next.tag}.`);
}

main();
