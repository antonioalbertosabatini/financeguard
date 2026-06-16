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

export const accountSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(ACCOUNT_TYPES),
  initialBalance: z.number().int(),
  currency: z.string().min(3).max(3),
  icon: z.preprocess(normalizeAccountIcon, z.string().min(1)),
});

export const accountInputSchema = accountSchema.omit({ id: true });

export const accountsFileSchema = z.object({
  accounts: z.array(accountSchema),
});

export type Account = z.infer<typeof accountSchema>;
export type AccountInput = z.infer<typeof accountInputSchema>;
