import { z } from "zod";

export const settingsSchema = z.object({
  defaultCurrency: z.string().min(3).max(3),
  locale: z.string().min(2),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  defaultCurrency: "EUR",
  locale: "it-IT",
};
