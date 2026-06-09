"use server";

import { revalidatePath } from "next/cache";
import {
  deleteBudget as dbDeleteBudget,
  getBudgets as dbGetBudgets,
  upsertBudget as dbUpsertBudget,
} from "@/lib/db/budgets";
import { budgetInputSchema, type BudgetInput } from "@/lib/schemas/budget";

export async function getBudgets() {
  return dbGetBudgets();
}

export async function upsertBudget(data: BudgetInput) {
  const parsed = budgetInputSchema.parse(data);
  const budget = await dbUpsertBudget(parsed);
  revalidatePath("/budget");
  revalidatePath("/");
  return budget;
}

export async function deleteBudget(id: string) {
  await dbDeleteBudget(id);
  revalidatePath("/budget");
  revalidatePath("/");
}
