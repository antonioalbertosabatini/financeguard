"use server";

import { revalidatePath } from "next/cache";
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
  const category = await dbCreateCategory(parsed);
  revalidatePath("/categories");
  revalidatePath("/");
  return category;
}

export async function updateCategory(id: string, data: CategoryInput) {
  const parsed = categoryInputSchema.parse(data);
  const category = await dbUpdateCategory(id, parsed);
  revalidatePath("/categories");
  revalidatePath("/");
  return category;
}

export async function deleteCategory(id: string) {
  const transactions = await getAllTransactions();
  if (transactions.some((t) => t.categoryId === id)) {
    throw new Error("Impossibile eliminare: categoria usata in transazioni");
  }
  await dbDeleteCategory(id);
  revalidatePath("/categories");
  revalidatePath("/");
}
