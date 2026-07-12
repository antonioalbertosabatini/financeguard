import type { Language } from "@/lib/i18n/config";
import { enMessages } from "@/lib/i18n/messages/en";
import { itMessages } from "@/lib/i18n/messages/it";
import type { MessageKey, TranslateParams } from "@/lib/i18n/types";

type Catalog = typeof itMessages;

const catalogs: Record<Language, Catalog> = {
  it: itMessages,
  en: enMessages as Catalog,
};

function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function translate(
  language: Language,
  key: MessageKey,
  params?: TranslateParams
): string {
  const catalog = catalogs[language];
  const value = getNestedValue(catalog as Record<string, unknown>, key);
  if (!value) {
    const fallback = getNestedValue(itMessages as Record<string, unknown>, key);
    return interpolate(fallback ?? key, params);
  }
  return interpolate(value, params);
}

export function getMonthLabels(language: Language): readonly string[] {
  const m = catalogs[language].labels.month;
  return [
    m.jan,
    m.feb,
    m.mar,
    m.apr,
    m.may,
    m.jun,
    m.jul,
    m.aug,
    m.sep,
    m.oct,
    m.nov,
    m.dec,
  ];
}

export function getMonthLabelsFull(language: Language): readonly string[] {
  const m = catalogs[language].labels.monthFull;
  return [
    m.january,
    m.february,
    m.march,
    m.april,
    m.may,
    m.june,
    m.july,
    m.august,
    m.september,
    m.october,
    m.november,
    m.december,
  ];
}

export function getAccountTypeLabel(
  language: Language,
  type: keyof typeof itMessages.labels.accountType
): string {
  return catalogs[language].labels.accountType[type];
}

export function getTransactionTypeLabel(
  language: Language,
  type: keyof typeof itMessages.labels.transactionType
): string {
  return catalogs[language].labels.transactionType[type];
}

export function formatErrorMessage(
  language: Language,
  err: unknown,
  fallbackKey: MessageKey = "common.error"
): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    const params =
      "params" in err
        ? (err as { params?: TranslateParams }).params
        : undefined;
    if (getNestedValue(catalogs[language] as Record<string, unknown>, code)) {
      return translate(language, code as MessageKey, params);
    }
  }
  if (err instanceof Error && err.message) {
    const translated = getNestedValue(
      catalogs[language] as Record<string, unknown>,
      err.message
    );
    if (translated) return translated;
    return err.message;
  }
  return translate(language, fallbackKey);
}
