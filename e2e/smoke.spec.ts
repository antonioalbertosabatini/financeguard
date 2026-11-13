import { expect, test, type Page } from "@playwright/test";
import {
  collectErrors,
  createLocalVault,
  expectNoHorizontalOverflow,
  seedDemoData,
  unlock,
} from "./helpers";

/**
 * Smoke test of the restyled UI: every section renders without console
 * errors or horizontal overflow on phone and desktop, in light and dark.
 * Screenshots are saved under test-results/ for manual review.
 */

const SECTIONS: { key: string; path: string; heading: RegExp }[] = [
  { key: "d", path: "/", heading: /Dashboard/ },
  { key: "t", path: "/transactions", heading: /Transazioni/ },
  { key: "a", path: "/accounts", heading: /Conti/ },
  { key: "b", path: "/budget", heading: /Budget/ },
  { key: "p", path: "/plans", heading: /Piani di accumulo|PAC/ },
  { key: "r", path: "/reports", heading: /Report/ },
  { key: "l", path: "/allocation", heading: /Ripartizione/ },
  { key: "c", path: "/categories", heading: /Categorie/ },
  { key: "e", path: "/data", heading: /Backup|Dati/ },
  { key: "u", path: "/profile", heading: /Profilo/ },
  { key: "s", path: "/settings", heading: /Impostazioni/ },
];

const VIEWPORTS = [
  { name: "small", width: 360, height: 780 },
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

/** Client-side navigation via the "G then <key>" shortcut (keeps the vault unlocked). */
async function goTo(page: Page, key: string, path: string) {
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  await page.keyboard.press("g");
  await page.keyboard.press(key);
  await expect(page).toHaveURL(new RegExp(`${path === "/" ? "/(\\?.*)?$" : path}`));
}

test.describe.serial("restyled UI smoke test", () => {
  let page: Page;
  let errors: string[];

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ locale: "it-IT" });
    await createLocalVault(page);
    await seedDemoData(page);
    // The seeding burst re-renders charts hundreds of times; start clean.
    await unlock(page);
    errors = collectErrors(page);
  });

  test.afterAll(async () => {
    await page?.close();
  });

  for (const scheme of ["light", "dark"] as const) {
    for (const viewport of VIEWPORTS) {
      test(`all sections render · ${viewport.name} · ${scheme}`, async () => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        for (const section of SECTIONS) {
          await goTo(page, section.key, section.path);
          await expect(page.getByRole("heading", { level: 1 })).toHaveText(section.heading);
          // Skeletons gone = data loaded.
          await expect(page.locator('[role="status"][aria-live="polite"]')).toHaveCount(0);
          await expectNoHorizontalOverflow(page);
          await page.screenshot({
            path: `test-results/screens/${scheme}-${viewport.name}${section.path === "/" ? "/dashboard" : section.path}.png`,
            fullPage: true,
          });
        }
        expect(errors, errors.join("\n")).toEqual([]);
      });
    }
  }

  test("theme follows the system and the manual choice wins", async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveClass(/dark/);

    await goTo(page, "s", "/settings");
    await page.getByRole("radio", { name: "Chiaro" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.getByRole("radio", { name: "Sistema" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("command palette navigates and finds transactions", async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.keyboard.press("ControlOrMeta+k");
    const input = page.getByPlaceholder("Cerca sezioni, azioni, movimenti…");
    await expect(input).toBeVisible();

    await input.fill("budget");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/budget/);

    await page.keyboard.press("ControlOrMeta+k");
    await input.fill("enel");
    await expect(page.getByText(/Movimenti del \d{4}/)).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/transactions\?tx=/);
    await expect(page.getByRole("dialog", { name: "Dettaglio transazione" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).not.toHaveURL(/tx=/);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("deleting asks for confirmation and can be cancelled", async () => {
    await goTo(page, "c", "/categories");
    const before = await page.getByRole("heading", { level: 3 }).count();
    await page.getByRole("button", { name: /elimina/i }).first().click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Annulla" }).click();
    await expect(dialog).toBeHidden();
    expect(await page.getByRole("heading", { level: 3 }).count()).toBe(before);
  });
});
