import { z } from "zod";
import {
  deriveLanguageFromLocale,
  mapLocale,
  type Language,
} from "@/lib/i18n/config";

const settingsFieldsSchema = z.object({
  defaultCurrency: z.string().min(3).max(3),
  language: z.enum(["it", "en"]).optional(),
  locale: z.string().min(2),
  showSyncWarning: z.boolean().default(true),
  /**
   * Provider di quotazioni e chiave scelti dall'utente. Sovrascrivono le
   * variabili compilate nel bundle, cosi' cambiare fonte non richiede di
   * ricompilare l'app; stanno nel vault, quindi la chiave resta cifrata.
   */
  marketProvider: z.string().nullable().optional().default(null),
  marketApiKey: z.string().nullable().optional().default(null),
});

function normalizeSettings(
  input: z.infer<typeof settingsFieldsSchema>
): Settings {
  const language: Language =
    input.language ?? deriveLanguageFromLocale(input.locale);
  return {
    defaultCurrency: input.defaultCurrency,
    language,
    locale: mapLocale(language),
    showSyncWarning: input.showSyncWarning,
    marketProvider: input.marketProvider ?? null,
    marketApiKey: input.marketApiKey ?? null,
  };
}

export const settingsSchema = settingsFieldsSchema.transform(normalizeSettings);

export type Settings = {
  defaultCurrency: string;
  language: Language;
  locale: string;
  showSyncWarning: boolean;
  marketProvider: string | null;
  marketApiKey: string | null;
};

export const DEFAULT_SETTINGS: Settings = {
  defaultCurrency: "EUR",
  language: "it",
  locale: "it-IT",
  showSyncWarning: true,
  marketProvider: null,
  marketApiKey: null,
};

export function settingsWithLanguage(
  settings: Settings,
  language: Language
): Settings {
  return {
    ...settings,
    language,
    locale: mapLocale(language),
  };
}
