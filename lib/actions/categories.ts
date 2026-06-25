import {
  createCategory as dbCreateCategory,
  deleteCategory as dbDeleteCategory,
  getCategories as dbGetCategories,
  updateCategory as dbUpdateCategory,
} from "@/lib/db/categories";
import { getAllTransactions } from "@/lib/db/transactions";
import {
  categoryInputSchema,
  type CategoryInput,
} from "@/lib/schemas/category";

export async function getCategories() {
  return dbGetCategories();
}

export async function createCategory(data: CategoryInput) {
  const parsed = categoryInputSchema.parse(data);
  return dbCreateCategory(parsed);
}

export async function updateCategory(id: string, data: CategoryInput) {
  const parsed = categoryInputSchema.parse(data);
  return dbUpdateCategory(id, parsed);
}

export async function deleteCategory(id: string) {
  const transactions = await getAllTransactions();
  if (transactions.some((t) => t.categoryId === id)) {
    throw new Error("Impossibile eliminare: categoria usata in transazioni");
  }
  await dbDeleteCategory(id);
}
