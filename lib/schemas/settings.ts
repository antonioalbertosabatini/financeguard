import { z } from "zod";
import {
  deriveLanguageFromLocale,
  mapLocale,
  type Language,
} from "@/lib/i18n/config";

export const INCOME_ALLOCATION_BUCKET_IDS = [
  "essentials",
  "discretionary",
  "debtOrInvest",
  "shortTerm",
  "longTerm",
] as const;

export type IncomeAllocationBucketId =
  (typeof INCOME_ALLOCATION_BUCKET_IDS)[number];

export type IncomeAllocationPercents = Record<
  IncomeAllocationBucketId,
  number
>;

export type IncomeAllocation = {
  percents: IncomeAllocationPercents;
  incomeCategoryIds: string[];
};

export const DEFAULT_INCOME_ALLOCATION_PERCENTS: IncomeAllocationPercents = {
  essentials: 55,
  discretionary: 5,
  debtOrInvest: 10,
  shortTerm: 15,
  longTerm: 15,
};

export const DEFAULT_INCOME_ALLOCATION: IncomeAllocation = {
  percents: { ...DEFAULT_INCOME_ALLOCATION_PERCENTS },
  incomeCategoryIds: [],
};

const percentValueSchema = z.number().int().min(0).max(100);

const incomeAllocationPercentsSchema = z.object({
  essentials: percentValueSchema.default(
    DEFAULT_INCOME_ALLOCATION_PERCENTS.essentials
  ),
  discretionary: percentValueSchema.default(
    DEFAULT_INCOME_ALLOCATION_PERCENTS.discretionary
  ),
  debtOrInvest: percentValueSchema.default(
    DEFAULT_INCOME_ALLOCATION_PERCENTS.debtOrInvest
  ),
  shortTerm: percentValueSchema.default(
    DEFAULT_INCOME_ALLOCATION_PERCENTS.shortTerm
  ),
  longTerm: percentValueSchema.default(
    DEFAULT_INCOME_ALLOCATION_PERCENTS.longTerm
  ),
});

const incomeAllocationSchema = z
  .object({
    percents: incomeAllocationPercentsSchema.default({
      ...DEFAULT_INCOME_ALLOCATION_PERCENTS,
    }),
    incomeCategoryIds: z.array(z.string()).default([]),
  })
  .default({
    percents: { ...DEFAULT_INCOME_ALLOCATION_PERCENTS },
    incomeCategoryIds: [],
  });

const settingsFieldsSchema = z.object({
  defaultCurrency: z.string().min(3).max(3),
  language: z.enum(["it", "en"]).optional(),
  locale: z.string().min(2),
  showSyncWarning: z.boolean().default(true),
  incomeAllocation: incomeAllocationSchema,
});

function percentsSumTo100(percents: IncomeAllocationPercents): boolean {
  return (
    INCOME_ALLOCATION_BUCKET_IDS.reduce(
      (sum, id) => sum + percents[id],
      0
    ) === 100
  );
}

function normalizeIncomeAllocation(
  value: IncomeAllocation
): IncomeAllocation {
  const percents = { ...value.percents };
  return {
    percents: percentsSumTo100(percents)
      ? percents
      : { ...DEFAULT_INCOME_ALLOCATION_PERCENTS },
    incomeCategoryIds: [...value.incomeCategoryIds],
  };
}

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
    incomeAllocation: normalizeIncomeAllocation(input.incomeAllocation),
  };
}

export const settingsSchema = settingsFieldsSchema.transform(normalizeSettings);

export type Settings = {
  defaultCurrency: string;
  language: Language;
  locale: string;
  showSyncWarning: boolean;
  incomeAllocation: IncomeAllocation;
};

export const DEFAULT_SETTINGS: Settings = {
  defaultCurrency: "EUR",
  language: "it",
  locale: "it-IT",
  showSyncWarning: true,
  incomeAllocation: {
    percents: { ...DEFAULT_INCOME_ALLOCATION_PERCENTS },
    incomeCategoryIds: [],
  },
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
