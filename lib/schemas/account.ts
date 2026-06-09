import { z } from "zod";
import { ACCOUNT_TYPES } from "@/lib/constants";

export const accountSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(ACCOUNT_TYPES),
  initialBalance: z.number().int(),
  currency: z.string().min(3).max(3),
});

export const accountInputSchema = accountSchema.omit({ id: true });

export const accountsFileSchema = z.object({
  accounts: z.array(accountSchema),
});

export type Account = z.infer<typeof accountSchema>;
export type AccountInput = z.infer<typeof accountInputSchema>;
