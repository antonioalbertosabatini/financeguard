import path from "path";
import { DATA_DIR } from "@/lib/constants";
import {
  budgetInputSchema,
  budgetSchema,
  budgetsFileSchema,
  normalizeBudgetTag,
  type Budget,
  type BudgetInput,
} from "@/lib/schemas/budget";
import { generateId, getDb } from "@/lib/db/index";

const FILE_PATH = path.join(DATA_DIR, "budgets.json");
const DEFAULT = { budgets: [] as Budget[] };

function budgetKey(input: Pick<Budget, "categoryId" | "tag">): string {
  return `${input.categoryId ?? ""}::${normalizeBudgetTag(input.tag) ?? ""}`;
}

export async function getBudgets(): Promise<Budget[]> {
  const db = await getDb(FILE_PATH, DEFAULT);
  await db.read();
  return budgetsFileSchema.parse(db.data).budgets;
}

export async function upsertBudget(input: BudgetInput): Promise<Budget> {
  const db = await getDb(FILE_PATH, DEFAULT);
  await db.read();
  const parsedInput = budgetInputSchema.parse(input);
  const inputKey = budgetKey(parsedInput);
  const existing = db.data.budgets.findIndex(
    (b) => budgetKey(budgetSchema.parse(b)) === inputKey
  );
  if (existing !== -1) {
    throw new Error("Esiste già un budget con questa combinazione");
  }
  const budget: Budget = budgetSchema.parse({
    ...parsedInput,
    id: generateId("bud"),
  });
  db.data.budgets.push(budget);
  await db.write();
  return budget;
}

export async function updateBudget(
  id: string,
  input: BudgetInput
): Promise<Budget> {
  const db = await getDb(FILE_PATH, DEFAULT);
  await db.read();
  const index = db.data.budgets.findIndex((b) => b.id === id);
  if (index === -1) throw new Error("Budget non trovato");

  const parsedInput = budgetInputSchema.parse(input);
  const inputKey = budgetKey(parsedInput);
  const duplicate = db.data.budgets.some((budget) => {
    const parsedBudget = budgetSchema.parse(budget);
    return parsedBudget.id !== id && budgetKey(parsedBudget) === inputKey;
  });
  if (duplicate) {
    throw new Error("Esiste già un budget con questa combinazione");
  }

  const updated = budgetSchema.parse({
    ...parsedInput,
    id,
  });
  db.data.budgets[index] = updated;
  await db.write();
  return updated;
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await getDb(FILE_PATH, DEFAULT);
  await db.read();
  db.data.budgets = db.data.budgets.filter((b) => b.id !== id);
  await db.write();
}
