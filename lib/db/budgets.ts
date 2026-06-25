import { commit, getDataset } from "@/lib/storage/data-store";
import {
  budgetInputSchema,
  budgetSchema,
  budgetsFileSchema,
  normalizeBudgetTag,
  type Budget,
  type BudgetInput,
} from "@/lib/schemas/budget";
import { generateId } from "@/lib/db/index";

function budgetKey(input: Pick<Budget, "categoryId" | "tag">): string {
  return `${input.categoryId ?? ""}::${normalizeBudgetTag(input.tag) ?? ""}`;
}

export async function getBudgets(): Promise<Budget[]> {
  return budgetsFileSchema.parse({ budgets: getDataset().budgets }).budgets;
}

export async function upsertBudget(input: BudgetInput): Promise<Budget> {
  const budgets = getDataset().budgets;
  const parsedInput = budgetInputSchema.parse(input);
  const inputKey = budgetKey(parsedInput);
  const existing = budgets.findIndex(
    (b) => budgetKey(budgetSchema.parse(b)) === inputKey
  );
  if (existing !== -1) {
    throw new Error("Esiste già un budget con questa combinazione");
  }
  const budget: Budget = budgetSchema.parse({
    ...parsedInput,
    id: generateId("bud"),
  });
  budgets.push(budget);
  commit();
  return budget;
}

export async function updateBudget(
  id: string,
  input: BudgetInput
): Promise<Budget> {
  const budgets = getDataset().budgets;
  const index = budgets.findIndex((b) => b.id === id);
  if (index === -1) throw new Error("Budget non trovato");

  const parsedInput = budgetInputSchema.parse(input);
  const inputKey = budgetKey(parsedInput);
  const duplicate = budgets.some((budget) => {
    const parsedBudget = budgetSchema.parse(budget);
    return parsedBudget.id !== id && budgetKey(parsedBudget) === inputKey;
  });
  if (duplicate) {
    throw new Error("Esiste già un budget con questa combinazione");
  }

  const updated = budgetSchema.parse({ ...parsedInput, id });
  budgets[index] = updated;
  commit();
  return updated;
}

export async function deleteBudget(id: string): Promise<void> {
  const dataset = getDataset();
  dataset.budgets = dataset.budgets.filter((b) => b.id !== id);
  commit();
}
