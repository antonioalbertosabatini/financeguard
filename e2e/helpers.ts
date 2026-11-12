import { expect, type Page } from "@playwright/test";
import { TEST_VAULT_PASSWORD } from "./fixtures/test-vault";

/**
 * The vault key lives only in memory: a full page reload locks the app.
 * Tests therefore navigate client-side (keyboard shortcuts / links) after
 * unlocking once.
 */

/** Create a fresh local-only vault (new browser context = empty IndexedDB). */
export async function createLocalVault(page: Page) {
  await page.goto("/setup");
  await page.getByText("Solo locale").click();
  await page.getByLabel("Password", { exact: true }).fill(TEST_VAULT_PASSWORD);
  await page.getByLabel("Conferma password").fill(TEST_VAULT_PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Imposta password" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

export async function unlock(page: Page) {
  await page.goto("/unlock");
  await page.getByLabel("Password").fill(TEST_VAULT_PASSWORD);
  await page.getByRole("button", { name: "Sblocca" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

/** Fill the vault with demo data through the dev-only helper. */
export async function seedDemoData(page: Page) {
  const result = await page.evaluate(async () => {
    const seed = (window as unknown as { __fgSeedDemo?: () => Promise<string> }).__fgSeedDemo;
    if (!seed) throw new Error("__fgSeedDemo missing: run the tests against `next dev`");
    return seed();
  });
  expect(result).toContain("demo");
}

/** Collects console errors and uncaught exceptions from now on. */
export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // Dev-server noise unrelated to the app.
    if (text.includes("webpack-hmr") || text.includes("[HMR]") || text.includes("Download the React DevTools")) return;
    errors.push(text);
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

/** Fails if any element makes the page scroll horizontally. */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, "page should not scroll horizontally").toBeLessThanOrEqual(1);
}
