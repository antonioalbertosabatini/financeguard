import { getCurrentLanguage } from "@/lib/i18n/runtime";
import { translate } from "@/lib/i18n/translate";
import type { Language } from "@/lib/i18n/config";

export const MIN_PASSWORD_LENGTH = 12;

export function getPasswordError(
  password: string,
  language: Language = getCurrentLanguage()
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return translate(language, "validation.passwordMinLength", {
      minLength: MIN_PASSWORD_LENGTH,
    });
  }
  return null;
}

export const ROOT_DATA_FILES = [
  "accounts.json",
  "categories.json",
  "budgets.json",
  "settings.json",
  "accumulation-plans.json",
] as const;

export const ACCUMULATION_FREQUENCIES = [
  "weekly",
  "biweekly",
  "monthly",
] as const;

export const ACCUMULATION_CATEGORY_ID = "cat_accumulation";
export const ACCUMULATION_CATEGORY_COLOR = "#0F766E";

export const ACCOUNT_TYPES = [
  "checking",
  "cash",
  "savings",
  "credit_card",
] as const;

export const CATEGORY_TYPES = ["income", "expense"] as const;

export const TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;

export const TRANSACTION_FORM_TYPES = ["income", "expense"] as const;

export const TRANSACTION_FILTER_TYPES = ["income", "expense"] as const;

export const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

export const MONTH_FULL_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;
