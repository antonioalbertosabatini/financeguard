import { z } from "zod";
import { getCurrentLanguage } from "@/lib/i18n/runtime";
import { translate } from "@/lib/i18n/translate";
import type { MessageKey, TranslateParams } from "@/lib/i18n/types";
import { normalizeIcon } from "@/lib/schemas/category";

export type SchemaTranslate = (
  key: MessageKey,
  params?: TranslateParams
) => string;

function defaultSchemaTranslate(key: MessageKey, params?: TranslateParams) {
  return translate(getCurrentLanguage(), key, params);
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeBudgetTag(value: unknown): string | undefined {
  const tag = normalizeOptionalString(value);
  return tag?.toLowerCase();
}

function normalizeBudgetName(value: unknown): string {
  if (typeof value !== "string") return "Budget";
  const name = value.trim();
  return name || "Budget";
}

function validateBudgetScope(
  data: { categoryId?: string; tag?: string },
  ctx: z.RefinementCtx,
  t: SchemaTranslate
) {
  if (!data.categoryId && !data.tag) {
    ctx.addIssue({
      code: "custom",
      message: t("validation.budgetScopeRequired"),
      path: ["categoryId"],
    });
  }
}

export function createBudgetSchemas(t: SchemaTranslate = defaultSchemaTranslate) {
  const budgetFieldsSchema = z.object({
    id: z.string(),
    name: z.preprocess(normalizeBudgetName, z.string().min(1)),
    categoryId: z.preprocess(normalizeOptionalString, z.string().min(1).optional()),
    tag: z.preprocess(
      normalizeBudgetTag,
      z
        .string()
        .min(1)
        .refine((tag) => !tag.includes(","), {
          message: t("validation.budgetSingleTag"),
        })
        .optional()
    ),
    icon: z.preprocess(normalizeIcon, z.string().min(1)),
    monthlyLimit: z.number().int().positive(),
  });

  const budgetInputFieldsSchema = budgetFieldsSchema.omit({ id: true }).extend({
    name: z.preprocess(normalizeOptionalString, z.string().min(1)),
  });

  const budgetSchema = budgetFieldsSchema.superRefine((data, ctx) =>
    validateBudgetScope(data, ctx, t)
  );

  const budgetInputSchema = budgetInputFieldsSchema.superRefine((data, ctx) =>
    validateBudgetScope(data, ctx, t)
  );

  const budgetsFileSchema = z.object({
    budgets: z.array(budgetSchema),
  });

  return { budgetSchema, budgetInputSchema, budgetsFileSchema };
}

const defaultSchemas = createBudgetSchemas();

export const budgetSchema = defaultSchemas.budgetSchema;
export const budgetInputSchema = defaultSchemas.budgetInputSchema;
export const budgetsFileSchema = defaultSchemas.budgetsFileSchema;

export type Budget = z.infer<typeof budgetSchema>;
export type BudgetInput = z.infer<typeof budgetInputSchema>;
