import { defineConfig, devices } from "@playwright/test";

/**
 * UI smoke tests (e2e/). They run against the Next dev server: the dev-only
 * `window.__fgSeedDemo()` helper fills the vault with demo data.
 *
 *   npm run test:e2e
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    // Full Chromium in new headless mode: no separate headless-shell download.
    channel: "chromium",
    // The assertions use the Italian UI strings.
    locale: "it-IT",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
