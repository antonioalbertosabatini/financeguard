import { z } from "zod";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const oneTimeContributionSchema = z.object({
  id: z.string().min(1),
  date: dateStringSchema,
  amount: z.number().int().positive(),
  sourceAccountId: z.string().min(1),
  /** Id della riga importata da file (es. "tr:<uuid>"), per evitare duplicati. */
  externalId: z.string().min(1).optional(),
});

export const ISIN_REGEX = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/** ISIN opzionale: stringa vuota -> undefined, normalizzato in maiuscolo. */
const isinSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.union([z.literal(""), z.string().regex(ISIN_REGEX)]))
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const accumulationPlanFieldsSchema = z.object({
  name: z.string().min(1),
  isin: isinSchema,
  oneTimeContributions: z.array(oneTimeContributionSchema).default([]),
});

export const accumulationPlanSchema = accumulationPlanFieldsSchema.extend({
  id: z.string().min(1),
});

export const accumulationPlanInputSchema = accumulationPlanFieldsSchema.omit({
  oneTimeContributions: true,
});

export const addAccumulationPlanOneTimeContributionSchema = z.object({
  amount: z.number().int().positive(),
  date: dateStringSchema,
  sourceAccountId: z.string().min(1),
});

export const removeAccumulationPlanOneTimeContributionSchema = z.object({
  contributionId: z.string().min(1),
});

export const accumulationPlansFileSchema = z.object({
  accumulationPlans: z.array(accumulationPlanSchema),
});

export type AccumulationPlan = z.infer<typeof accumulationPlanSchema>;
export type AccumulationPlanInput = z.infer<typeof accumulationPlanInputSchema>;
export type OneTimeContribution = z.infer<typeof oneTimeContributionSchema>;
export type AddAccumulationPlanOneTimeContributionInput = z.infer<
  typeof addAccumulationPlanOneTimeContributionSchema
>;
