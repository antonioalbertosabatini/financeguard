import path from "path";
import { DATA_DIR } from "@/lib/constants";
import {
  categoryInputSchema,
  categorySchema,
  parseCategoriesFile,
  type Category,
  type CategoryInput,
} from "@/lib/schemas/category";
import { generateId, getDb } from "@/lib/db/index";
import { DEFAULT_CATEGORIES } from "@/lib/db/seed";

const FILE_PATH = path.join(DATA_DIR, "categories.json");
const DEFAULT = { categories: [] as Category[] };

async function loadCategoriesFromDb(): Promise<Category[]> {
  const db = await getDb(FILE_PATH, DEFAULT);
  await db.read();

  if (db.data.categories.length === 0) {
    db.data.categories = DEFAULT_CATEGORIES;
    await db.write();
    return DEFAULT_CATEGORIES;
  }

  const parsed = parseCategoriesFile(db.data);
  if (parsed.length === 0 && Array.isArray(db.data.categories) && db.data.categories.length > 0) {
    throw new Error(
      "categories.json contiene dati non validi. Verifica id, name, type (income/expense), color (#RRGGBB) e icon."
    );
  }

  if (parsed.length !== db.data.categories.length) {
    db.data.categories = parsed;
    await db.write();
  }

  return parsed;
}

export async function getCategories(): Promise<Category[]> {
  return loadCategoriesFromDb();
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const parsedInput = categoryInputSchema.parse(input);
  const db = await getDb(FILE_PATH, DEFAULT);
  await db.read();
  const category: Category = categorySchema.parse({
    ...parsedInput,
    id: generateId("cat"),
  });
  db.data.categories.push(category);
  await db.write();
  return category;
}

export async function updateCategory(
  id: string,
  input: CategoryInput
): Promise<Category> {
  const parsedInput = categoryInputSchema.parse(input);
  const db = await getDb(FILE_PATH, DEFAULT);
  await db.read();
  const index = db.data.categories.findIndex((c) => c.id === id);
  if (index === -1) throw new Error("Categoria non trovata");
  const updated = categorySchema.parse({ ...parsedInput, id });
  db.data.categories[index] = updated;
  await db.write();
  return updated;
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb(FILE_PATH, DEFAULT);
  await db.read();
  db.data.categories = db.data.categories.filter((c) => c.id !== id);
  await db.write();
}
