import { z } from "zod";
import { ACCUMULATION_FREQUENCIES } from "@/lib/constants";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const pausePeriodSchema = z
  .object({
    from: dateStringSchema,
    to: dateStringSchema.optional(),
  })
  .superRefine((period, ctx) => {
    if (period.to && period.to < period.from) {
      ctx.addIssue({
        code: "custom",
        message: "Pause end cannot be before pause start",
        path: ["to"],
      });
    }
  });

const amountSegmentSchema = z.object({
  from: dateStringSchema,
  amount: z.number().int().positive(),
});

const accumulationPlanFieldsSchema = z.object({
  name: z.string().min(1),
  amount: z.number().int().positive(),
  frequency: z.enum(ACCUMULATION_FREQUENCIES),
  sourceAccountId: z.string().min(1),
  startDate: dateStringSchema,
  status: z.enum(["active", "paused"]),
  pausePeriods: z.array(pausePeriodSchema).default([]),
  amountSchedule: z.array(amountSegmentSchema).default([]),
});

export const accumulationPlanSchema = accumulationPlanFieldsSchema.extend({
  id: z.string().min(1),
});

export const accumulationPlanInputSchema = accumulationPlanFieldsSchema.omit({
  status: true,
  pausePeriods: true,
  amountSchedule: true,
});

export const changeAccumulationPlanAmountSchema = z.object({
  amount: z.number().int().positive(),
  effectiveFrom: dateStringSchema,
});

export const removeAccumulationPlanAmountChangeSchema = z.object({
  from: dateStringSchema,
});

export const accumulationPlansFileSchema = z.object({
  accumulationPlans: z.array(accumulationPlanSchema),
});

export type AccumulationPlan = z.infer<typeof accumulationPlanSchema>;
export type AccumulationPlanInput = z.infer<typeof accumulationPlanInputSchema>;
export type AccumulationFrequency =
  (typeof ACCUMULATION_FREQUENCIES)[number];
export type PausePeriod = z.infer<typeof pausePeriodSchema>;
export type AmountSegment = z.infer<typeof amountSegmentSchema>;
export type ChangeAccumulationPlanAmountInput = z.infer<
  typeof changeAccumulationPlanAmountSchema
>;
