import fs from "fs/promises";
import path from "path";
import { DATA_DIR, TRANSACTIONS_DIR } from "@/lib/constants";
import { accountsFileSchema } from "@/lib/schemas/account";
import { parseCategoriesFile } from "@/lib/schemas/category";
import { budgetsFileSchema } from "@/lib/schemas/budget";
import { settingsSchema } from "@/lib/schemas/settings";

export const ROOT_DATA_FILES = [
  "accounts.json",
  "categories.json",
  "budgets.json",
  "settings.json",
] as const;

export const rootFileValidators: Record<string, (data: unknown) => unknown> = {
  "accounts.json": (d) => accountsFileSchema.parse(d),
  "categories.json": (d) => ({ categories: parseCategoriesFile(d) }),
  "budgets.json": (d) => budgetsFileSchema.parse(d),
  "settings.json": (d) => settingsSchema.parse(d),
};

export async function clearDataFiles(): Promise<void> {
  for (const filename of ROOT_DATA_FILES) {
    await fs.rm(path.join(DATA_DIR, filename), { force: true });
  }

  try {
    const txFiles = await fs.readdir(TRANSACTIONS_DIR);
    for (const filename of txFiles) {
      if (!filename.endsWith(".json")) continue;
      await fs.rm(path.join(TRANSACTIONS_DIR, filename), { force: true });
    }
  } catch {
    // transactions dir may not exist yet
  }
}
