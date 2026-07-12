import { commit, getDataset, getDeviceId } from "@/lib/storage/data-store";
import { AppError } from "@/lib/i18n/app-error";
import { mapLocale } from "@/lib/i18n/config";
import { getCurrentLanguage } from "@/lib/i18n/runtime";
import {
  trackCategoryUpsert,
  trackDelete,
} from "@/lib/sync/sync-metadata";
import {
  categorySchema,
  type Category,
  type CategoryInput,
} from "@/lib/schemas/category";
import { generateId } from "@/lib/db/index";

export async function getCategories(): Promise<Category[]> {
  return [...getDataset().categories].sort((a, b) =>
    a.name.localeCompare(b.name, mapLocale(getCurrentLanguage()), {
      sensitivity: "base",
    })
  );
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const category: Category = categorySchema.parse({
    ...input,
    id: generateId("cat"),
  });
  const dataset = getDataset();
  dataset.categories.push(category);
  trackCategoryUpsert(dataset, category, getDeviceId());
  commit();
  return category;
}

export async function updateCategory(
  id: string,
  input: CategoryInput
): Promise<Category> {
  const categories = getDataset().categories;
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) throw new AppError("errors.categoryNotFound");
  const previous = categories[index];
  const updated = categorySchema.parse({ ...input, id });
  categories[index] = updated;
  trackCategoryUpsert(getDataset(), updated, getDeviceId(), previous);
  commit();
  return updated;
}

export async function deleteCategory(id: string): Promise<void> {
  const dataset = getDataset();
  dataset.categories = dataset.categories.filter((c) => c.id !== id);
  trackDelete(dataset, "category", id, getDeviceId());
  commit();
}
