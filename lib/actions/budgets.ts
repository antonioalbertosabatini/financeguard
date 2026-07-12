import {
  deleteBudget as dbDeleteBudget,
  getBudgets as dbGetBudgets,
  updateBudget as dbUpdateBudget,
  upsertBudget as dbUpsertBudget,
} from "@/lib/db/budgets";
import { getCategories } from "@/lib/db/categories";
import { AppError } from "@/lib/i18n/app-error";
import { getCurrentLanguage } from "@/lib/i18n/runtime";
import { translate } from "@/lib/i18n/translate";
import { createBudgetSchemas, type BudgetInput } from "@/lib/schemas/budget";

export async function getBudgets() {
  return dbGetBudgets();
}

async function validateBudgetInput(data: BudgetInput) {
  const { budgetInputSchema } = createBudgetSchemas((key, params) =>
    translate(getCurrentLanguage(), key, params)
  );
  const parsed = budgetInputSchema.parse(data);
  if (parsed.categoryId) {
    const categories = await getCategories();
    const category = categories.find((c) => c.id === parsed.categoryId);
    if (!category || category.type !== "expense") {
      throw new AppError("validation.selectExpenseCategory");
    }
  }
  return parsed;
}

export async function upsertBudget(data: BudgetInput) {
  const parsed = await validateBudgetInput(data);
  return dbUpsertBudget(parsed);
}

export async function updateBudget(id: string, data: BudgetInput) {
  const parsed = await validateBudgetInput(data);
  return dbUpdateBudget(id, parsed);
}

export async function deleteBudget(id: string) {
  await dbDeleteBudget(id);
}
