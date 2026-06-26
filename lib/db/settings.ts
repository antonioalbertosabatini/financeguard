import { commit, getDataset, getDeviceId } from "@/lib/storage/data-store";
import { trackSettingsUpsert } from "@/lib/sync/sync-metadata";
import { settingsSchema, type Settings } from "@/lib/schemas/settings";

export async function getSettings(): Promise<Settings> {
  return settingsSchema.parse(getDataset().settings);
}

export async function updateSettings(input: Settings): Promise<Settings> {
  const dataset = getDataset();
  const previous = dataset.settings;
  const parsed = settingsSchema.parse(input);
  dataset.settings = parsed;
  trackSettingsUpsert(dataset, parsed, getDeviceId(), previous);
  commit();
  return parsed;
}
