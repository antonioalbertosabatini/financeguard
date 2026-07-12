export const SUPPORTED_LANGUAGES = ["it", "en"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LOCALE_MAP: Record<Language, string> = {
  it: "it-IT",
  en: "en-US",
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  it: "Italiano",
  en: "English",
};

export const LANGUAGE_STORAGE_KEY = "financeguard:language";
export const LANGUAGE_CHANGE_EVENT = "financeguard:language-change";

export function deriveLanguageFromLocale(locale: string): Language {
  const normalized = locale.trim().toLowerCase();
  if (normalized.startsWith("en")) return "en";
  return "it";
}

export function mapLocale(language: Language): string {
  return LANGUAGE_LOCALE_MAP[language];
}

export function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") return "it";
  const lang = navigator.language?.toLowerCase() ?? "";
  if (lang.startsWith("en")) return "en";
  return "it";
}

export function readStoredLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "it" || stored === "en") return stored;
  } catch {
    // ignore
  }
  return null;
}

export function writeStoredLanguage(language: Language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  } catch {
    // ignore
  }
}
