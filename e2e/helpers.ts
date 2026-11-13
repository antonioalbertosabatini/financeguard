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

/**
 * Fails if any element of the page content sticks out of the viewport.
 * `html, body { overflow-x: clip }` hides such overflow from scrollWidth, so we
 * look at element boxes instead, ignoring those inside an intentional
 * horizontal scroller (e.g. the daily chart in Reports).
 */
export async function expectNoHorizontalOverflow(page: Page) {
  const offenders = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const insideScroller = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (getComputedStyle(p).overflowX !== "visible") return true;
      }
      return false;
    };
    return [...document.querySelectorAll("main *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > vw + 1 && !insideScroller(el);
      })
      .slice(0, 5)
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 60)}`);
  });
  expect(offenders, "elements wider than the screen").toEqual([]);
}
