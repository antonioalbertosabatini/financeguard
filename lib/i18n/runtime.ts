import type { Language } from "@/lib/i18n/config";

let globalLanguage: Language = "it";

export function getCurrentLanguage(): Language {
  return globalLanguage;
}

export function setCurrentLanguage(language: Language) {
  globalLanguage = language;
}
