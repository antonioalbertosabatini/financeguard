import { commit, getDataset } from "@/lib/storage/data-store";
import { settingsSchema, type Settings } from "@/lib/schemas/settings";

export async function getSettings(): Promise<Settings> {
  return settingsSchema.parse(getDataset().settings);
}

export async function updateSettings(input: Settings): Promise<Settings> {
  const parsed = settingsSchema.parse(input);
  getDataset().settings = parsed;
  commit();
  return parsed;
}
