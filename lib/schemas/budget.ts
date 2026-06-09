import { z } from "zod";

export const budgetSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  monthlyLimit: z.number().int().positive(),
});

export const budgetInputSchema = budgetSchema.omit({ id: true });

export const budgetsFileSchema = z.object({
  budgets: z.array(budgetSchema),
});

export type Budget = z.infer<typeof budgetSchema>;
export type BudgetInput = z.infer<typeof budgetInputSchema>;
