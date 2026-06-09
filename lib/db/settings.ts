import path from "path";
import { DATA_DIR } from "@/lib/constants";
import {
  DEFAULT_SETTINGS,
  settingsSchema,
  type Settings,
} from "@/lib/schemas/settings";
import { getDb } from "@/lib/db/index";

const FILE_PATH = path.join(DATA_DIR, "settings.json");

export async function getSettings(): Promise<Settings> {
  const db = await getDb(FILE_PATH, DEFAULT_SETTINGS);
  await db.read();
  return settingsSchema.parse(db.data);
}

export async function updateSettings(input: Settings): Promise<Settings> {
  const parsed = settingsSchema.parse(input);
  const db = await getDb(FILE_PATH, DEFAULT_SETTINGS);
  await db.read();
  db.data = parsed;
  await db.write();
  return parsed;
}
