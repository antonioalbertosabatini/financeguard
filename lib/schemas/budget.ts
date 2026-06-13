import { z } from "zod";
import { normalizeIcon } from "@/lib/schemas/category";

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

const budgetFieldsSchema = z.object({
  id: z.string(),
  name: z.preprocess(normalizeBudgetName, z.string().min(1)),
  categoryId: z.preprocess(normalizeOptionalString, z.string().min(1).optional()),
  tag: z.preprocess(
    normalizeBudgetTag,
    z.string().min(1).refine((tag) => !tag.includes(","), {
      message: "Usa un solo tag per budget",
    }).optional()
  ),
  icon: z.preprocess(normalizeIcon, z.string().min(1)),
  monthlyLimit: z.number().int().positive(),
});

const budgetInputFieldsSchema = budgetFieldsSchema.omit({ id: true }).extend({
  name: z.preprocess(normalizeOptionalString, z.string().min(1)),
});

function validateBudgetScope(
  data: { categoryId?: string; tag?: string },
  ctx: z.RefinementCtx
) {
  if (!data.categoryId && !data.tag) {
    ctx.addIssue({
      code: "custom",
      message: "Seleziona una categoria o inserisci un tag",
      path: ["categoryId"],
    });
  }
}

export const budgetSchema = budgetFieldsSchema.superRefine(validateBudgetScope);

export const budgetInputSchema =
  budgetInputFieldsSchema.superRefine(validateBudgetScope);

export const budgetsFileSchema = z.object({
  budgets: z.array(budgetSchema),
});

export type Budget = z.infer<typeof budgetSchema>;
export type BudgetInput = z.infer<typeof budgetInputSchema>;
