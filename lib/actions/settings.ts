"use server";

import { revalidatePath } from "next/cache";
import { getSettings as dbGetSettings, updateSettings as dbUpdateSettings } from "@/lib/db/settings";
import { settingsSchema, type Settings } from "@/lib/schemas/settings";

export async function getSettings() {
  return dbGetSettings();
}

export async function updateSettings(data: Settings) {
  const parsed = settingsSchema.parse(data);
  const settings = await dbUpdateSettings(parsed);
  revalidatePath("/settings");
  revalidatePath("/");
  return settings;
}
