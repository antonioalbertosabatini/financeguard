import { z } from "zod";
import { ACCOUNT_TYPES } from "@/lib/constants";
import {
  ACCOUNT_ICON_FALLBACK,
  KNOWN_ACCOUNT_ICONS,
} from "@/lib/constants/account-icons";

export { KNOWN_ACCOUNT_ICONS };

export function normalizeAccountIcon(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return ACCOUNT_ICON_FALLBACK;
  const icon = value.trim().toLowerCase();
  return KNOWN_ACCOUNT_ICONS.includes(
    icon as (typeof KNOWN_ACCOUNT_ICONS)[number]
  )
    ? icon
    : ACCOUNT_ICON_FALLBACK;
}

const accountBaseSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(ACCOUNT_TYPES),
  initialBalance: z.number().int(),
  currency: z.string().min(3).max(3),
  icon: z.preprocess(normalizeAccountIcon, z.string().min(1)),
});

export const accountSchema = accountBaseSchema.extend({
  order: z.number().int().nonnegative(),
});

const rawAccountSchema = accountBaseSchema.extend({
  order: z.number().int().nonnegative().optional(),
});

export const accountInputSchema = accountSchema.omit({ id: true, order: true });

export type Account = z.infer<typeof accountSchema>;
export type AccountInput = z.infer<typeof accountInputSchema>;
export type AccountDraft = z.infer<typeof rawAccountSchema>;

/** Vault e backup senza `order`: usa l'indice nell'array JSON. */
export function assignAccountOrders(accounts: AccountDraft[]): Account[] {
  return accounts.map((account, index) => ({
    ...account,
    order: account.order ?? index,
  }));
}

export function sortAccounts<T extends Pick<Account, "id" | "order">>(
  accounts: T[]
): T[] {
  return [...accounts].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id)
  );
}

export const accountsFileSchema = z.object({
  accounts: z.array(rawAccountSchema).transform(assignAccountOrders),
});
