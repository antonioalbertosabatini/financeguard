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
  };
}

export const settingsSchema = settingsFieldsSchema.transform(normalizeSettings);

export type Settings = {
  defaultCurrency: string;
  language: Language;
  locale: string;
  showSyncWarning: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  defaultCurrency: "EUR",
  language: "it",
  locale: "it-IT",
  showSyncWarning: true,
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
