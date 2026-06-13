"use server";

import { revalidatePath } from "next/cache";
import {
  deleteBudget as dbDeleteBudget,
  getBudgets as dbGetBudgets,
  updateBudget as dbUpdateBudget,
  upsertBudget as dbUpsertBudget,
} from "@/lib/db/budgets";
import { getCategories } from "@/lib/db/categories";
import { budgetInputSchema, type BudgetInput } from "@/lib/schemas/budget";

export async function getBudgets() {
  return dbGetBudgets();
}

async function validateBudgetInput(data: BudgetInput) {
  const parsed = budgetInputSchema.parse(data);
  if (parsed.categoryId) {
    const categories = await getCategories();
    const category = categories.find((c) => c.id === parsed.categoryId);
    if (!category || category.type !== "expense") {
      throw new Error("Seleziona una categoria di spesa valida");
    }
  }
  return parsed;
}

export async function upsertBudget(data: BudgetInput) {
  const parsed = await validateBudgetInput(data);
  const budget = await dbUpsertBudget(parsed);
  revalidatePath("/budget");
  revalidatePath("/");
  return budget;
}

export async function updateBudget(id: string, data: BudgetInput) {
  const parsed = await validateBudgetInput(data);
  const budget = await dbUpdateBudget(id, parsed);
  revalidatePath("/budget");
  revalidatePath("/");
  return budget;
}

export async function deleteBudget(id: string) {
  await dbDeleteBudget(id);
  revalidatePath("/budget");
  revalidatePath("/");
}
