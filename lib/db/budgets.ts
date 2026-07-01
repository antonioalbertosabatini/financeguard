import { commit, getDataset, getDeviceId } from "@/lib/storage/data-store";
import {
  trackBudgetUpsert,
  trackDelete,
} from "@/lib/sync/sync-metadata";
import {
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
  const inputKey = budgetKey(input);
  const existing = budgets.findIndex(
    (b) => budgetKey(budgetSchema.parse(b)) === inputKey
  );
  if (existing !== -1) {
    throw new Error("Esiste già un budget con questa combinazione");
  }
  const budget: Budget = budgetSchema.parse({
    ...input,
    id: generateId("bud"),
  });
  const dataset = getDataset();
  dataset.budgets.push(budget);
  trackBudgetUpsert(dataset, budget, getDeviceId());
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

  const inputKey = budgetKey(input);
  const duplicate = budgets.some((budget) => {
    const parsedBudget = budgetSchema.parse(budget);
    return parsedBudget.id !== id && budgetKey(parsedBudget) === inputKey;
  });
  if (duplicate) {
    throw new Error("Esiste già un budget con questa combinazione");
  }

  const previous = budgets[index];
  const updated = budgetSchema.parse({ ...input, id });
  budgets[index] = updated;
  trackBudgetUpsert(getDataset(), updated, getDeviceId(), previous);
  commit();
  return updated;
}

export async function deleteBudget(id: string): Promise<void> {
  const dataset = getDataset();
  dataset.budgets = dataset.budgets.filter((b) => b.id !== id);
  trackDelete(dataset, "budget", id, getDeviceId());
  commit();
}
