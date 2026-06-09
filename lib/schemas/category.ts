import { z } from "zod";
import { CATEGORY_TYPES } from "@/lib/constants";

export const KNOWN_CATEGORY_ICONS = [
  "shopping-cart",
  "banknote",
  "home",
  "car",
  "utensils",
  "heart",
  "gamepad-2",
  "briefcase",
  "gift",
  "plane",
  "circle",
] as const;

const TYPE_ALIASES: Record<string, (typeof CATEGORY_TYPES)[number]> = {
  income: "income",
  expense: "expense",
  entrata: "income",
  entrate: "income",
  uscita: "expense",
  uscite: "expense",
};

export function normalizeColor(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "#6366F1";

  let hex = value.trim();
  if (!hex.startsWith("#")) hex = `#${hex}`;

  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    hex = `#${r}${r}${g}${g}${b}${b}`;
  }

  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return hex.toUpperCase();
  }

  return "#6366F1";
}

export function normalizeIcon(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "circle";
  const icon = value.trim().toLowerCase();
  return KNOWN_CATEGORY_ICONS.includes(
    icon as (typeof KNOWN_CATEGORY_ICONS)[number]
  )
    ? icon
    : "circle";
}

export function normalizeType(value: unknown): (typeof CATEGORY_TYPES)[number] {
  if (typeof value !== "string") return "expense";
  const key = value.trim().toLowerCase();
  return TYPE_ALIASES[key] ?? "expense";
}

const categoryFieldsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.preprocess(normalizeType, z.enum(CATEGORY_TYPES)),
  color: z.preprocess(normalizeColor, z.string().regex(/^#[0-9A-F]{6}$/)),
  icon: z.preprocess(normalizeIcon, z.string().min(1)),
});

export const categorySchema = categoryFieldsSchema;

export const categoryInputSchema = categoryFieldsSchema.omit({ id: true });

export const categoriesFileSchema = z.object({
  categories: z.array(categorySchema),
});

const rawCategorySchema = z
  .object({
    id: z.unknown(),
    name: z.unknown(),
    type: z.unknown(),
    color: z.unknown(),
    icon: z.unknown().optional(),
  })
  .passthrough();

export function parseCategoriesFile(data: unknown): Category[] {
  if (!data || typeof data !== "object" || !("categories" in data)) {
    return [];
  }

  const rawList = (data as { categories: unknown }).categories;
  if (!Array.isArray(rawList)) return [];

  const parsed: Category[] = [];

  for (const [index, item] of rawList.entries()) {
    const rawResult = rawCategorySchema.safeParse(item);
    if (!rawResult.success) {
      console.warn(
        `[categories.json] Voce ${index} ignorata: struttura non valida`
      );
      continue;
    }

    const raw = rawResult.data;
    const id =
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : `cat_${index}`;
    const name =
      typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim()
        : null;

    if (!name) {
      console.warn(
        `[categories.json] Voce ${index} ignorata: nome mancante`
      );
      continue;
    }

    const result = categorySchema.safeParse({
      id,
      name,
      type: raw.type,
      color: raw.color,
      icon: raw.icon,
    });

    if (result.success) {
      parsed.push(result.data);
    } else {
      console.warn(
        `[categories.json] Voce ${index} (${name}) ignorata:`,
        result.error.issues.map((i) => i.message).join(", ")
      );
    }
  }

  return parsed;
}

export type Category = z.infer<typeof categorySchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
