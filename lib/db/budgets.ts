import path from "path";
import { DATA_DIR } from "@/lib/constants";
import {
  budgetsFileSchema,
  type Budget,
  type BudgetInput,
} from "@/lib/schemas/budget";
import { generateId, getDb } from "@/lib/db/index";

const FILE_PATH = path.join(DATA_DIR, "budgets.json");
const DEFAULT = { budgets: [] as Budget[] };

export async function getBudgets(): Promise<Budget[]> {
  const db = await getDb(FILE_PATH, DEFAULT);
  await db.read();
  return budgetsFileSchema.parse(db.data).budgets;
}

export async function upsertBudget(input: BudgetInput): Promise<Budget> {
  const db = await getDb(FILE_PATH, DEFAULT);
  await db.read();
  const existing = db.data.budgets.findIndex(
    (b) => b.categoryId === input.categoryId
  );
  if (existing !== -1) {
    const updated: Budget = {
      ...db.data.budgets[existing],
      ...input,
    };
    db.data.budgets[existing] = updated;
    await db.write();
    return updated;
  }
  const budget: Budget = { ...input, id: generateId("bud") };
  db.data.budgets.push(budget);
  await db.write();
  return budget;
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await getDb(FILE_PATH, DEFAULT);
  await db.read();
  db.data.budgets = db.data.budgets.filter((b) => b.id !== id);
  await db.write();
}
