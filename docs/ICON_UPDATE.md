# Updating the App Icon

FinanceGuard uses a **single source of truth** for branding assets:

```
public/icon.svg
```

All platform-specific icons are generated from this file. Do not edit generated PNG/WebP files by hand unless you are debugging the pipeline.

## Quick workflow

1. Replace `public/icon.svg` with your new SVG.
2. Regenerate all derived assets:

   ```bash
   npm run icons:generate
   ```

3. Rebuild and ship for each target you care about (see below).

That is the full icon update for most cases.

## What `npm run icons:generate` does

The script runs two steps:

### Step 1 — `node assets/generate-icons.mjs`

Uses [sharp](https://sharp.pixelplumbing.com/) to produce:

| Output | Purpose |
|--------|---------|
| `public/icons/icon-*.webp` | PWA raster icons (48–512 px); manifest references 192 and 512 |
| `assets/icon-only.png` | Source for Capacitor iOS icon |
| `assets/icon-foreground.png` | Android adaptive icon foreground |
| `assets/icon-background.png` | Android adaptive icon background |
| `assets/splash.png`, `assets/splash-dark.png` | Capacitor splash screens |
| `build/icon.png` | Electron desktop app icon |

Optional: if the logo background color changes, update the `BG` constant in `assets/generate-icons.mjs` (default `#0b0b0c`).

### Step 2 — `npx @capacitor/assets generate --ios --android`

Copies the generated sources into native projects:

- **iOS** — `ios/App/App/Assets.xcassets/` (AppIcon + Splash)
- **Android** — `android/app/src/main/res/` (launcher icons + splash)

## Platform-specific rebuild commands

After regenerating icons, rebuild the app for each platform you ship:

| Platform | Command | Notes |
|----------|---------|-------|
| **Web / PWA** | `npm run build` | Static export in `out/`. Hard-refresh the browser or reinstall the PWA to see the new icon. |
| **Electron (desktop)** | `npm run electron:build` | Uses `build/icon.png`. Output in `dist-electron/`. |
| **iOS** | `npm run cap:ios` | Builds web app, syncs Capacitor, opens Xcode. Archive and upload from Xcode. |
| **Android** | `npm run cap:android` | Builds web app, syncs Capacitor, opens Android Studio. Build APK/AAB from Android Studio. |
| **Capacitor sync only** | `npm run cap:sync` | Sync web build + native assets without opening an IDE. |

Development:

- **Web dev server** — `npm run dev` (serves `public/icon.svg` directly; refresh after replacing the SVG).
- **Electron dev** — `npm run electron:build` first if you need the new `build/icon.png`, then `npm run electron:dev`.

## Where the logo appears in the app

| Location | Asset |
|----------|-------|
| Sidebar / auth UI | `/icon.svg` via `components/layout/app-logo.tsx` |
| PWA install prompt / home screen | `app/manifest.ts` → `/icon.svg` + `/icons/icon-192.webp`, `/icons/icon-512.webp` |
| iOS home screen | Generated into Xcode asset catalog |
| Android launcher | Generated into `mipmap-*` resources |
| macOS / Windows / Linux desktop | `build/icon.png` via electron-builder |

## Troubleshooting

- **Logo looks blurry** — Ensure `public/icon.svg` has a square viewBox and enough detail at 1024×1024. The generator renders at 300 DPI.
- **Android icon clipped** — Foreground is scaled to ~62% of the canvas for the adaptive icon safe zone. Keep important shapes centered.
- **PWA still shows old icon** — Browsers cache manifest icons aggressively. Clear site data, reinstall the PWA, or bump cache by redeploying.
- **iOS icon unchanged in simulator** — Clean build folder in Xcode (Product → Clean Build Folder) and reinstall the app.

## Files you should not edit manually

- `public/icons/*.webp`
- `assets/icon-*.png`, `assets/splash*.png`
- `build/icon.png`
- `ios/App/App/Assets.xcassets/**`
- `android/app/src/main/res/mipmap-*/**`
