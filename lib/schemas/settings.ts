import { z } from "zod";

export const settingsSchema = z.object({
  defaultCurrency: z.string().min(3).max(3),
  locale: z.string().min(2),
  // Mostra il banner rosso quando il sync cloud non e' attivo. `.default(true)`
  // rende il campo retrocompatibile: i vault esistenti (privi del campo) lo
  // vedono valorizzato a true al parse, senza migrazioni.
  showSyncWarning: z.boolean().default(true),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  defaultCurrency: "EUR",
  locale: "it-IT",
  showSyncWarning: true,
};
