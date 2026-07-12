"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  detectBrowserLanguage,
  LANGUAGE_CHANGE_EVENT,
  mapLocale,
  readStoredLanguage,
  writeStoredLanguage,
  type Language,
} from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/translate";
import type { MessageKey, TranslateParams } from "@/lib/i18n/types";
import { getSettings } from "@/lib/actions/settings";
import { useDataStore } from "@/lib/storage/data-store";

import {
  getCurrentLanguage,
  setCurrentLanguage,
} from "@/lib/i18n/runtime";

function resolveBootLanguage(): Language {
  return readStoredLanguage() ?? detectBrowserLanguage();
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);
}

function getClientSnapshot(): Language {
  return getCurrentLanguage();
}

function getServerSnapshot(): Language {
  return "it";
}

type I18nContextValue = {
  language: Language;
  locale: string;
  t: (key: MessageKey, params?: TranslateParams) => string;
  setLanguage: (language: Language) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { status } = useDataStore();

  const language = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    const boot = resolveBootLanguage();
    setCurrentLanguage(boot);
    document.documentElement.lang = boot;
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }, []);

  useEffect(() => {
    if (status !== "unlocked") return;
    void getSettings()
      .then((settings) => {
        setCurrentLanguage(settings.language);
        writeStoredLanguage(settings.language);
        document.documentElement.lang = settings.language;
      })
      .catch(() => {
        // vault may be transitioning
      });
  }, [status]);

  const setLanguage = useCallback((next: Language) => {
    setCurrentLanguage(next);
    writeStoredLanguage(next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      locale: mapLocale(language),
      t: (key, params) => translate(language, key, params),
      setLanguage,
    }),
    [language, setLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

export function useFormattingLocale(): string {
  const { locale } = useI18n();
  return locale;
}
