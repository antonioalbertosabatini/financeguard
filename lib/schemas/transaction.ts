import { z } from "zod";
import { TRANSACTION_TYPES } from "@/lib/constants";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const transactionFieldsSchema = z.object({
  date: dateStringSchema,
  amount: z.number().int().positive(),
  type: z.enum(TRANSACTION_TYPES),
  categoryId: z.string().nullable(),
  accountId: z.string(),
  notes: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
  isRecurring: z.boolean(),
  recurrenceStart: dateStringSchema.optional(),
  recurrenceEnd: dateStringSchema.optional(),
});

type TransactionFields = z.infer<typeof transactionFieldsSchema>;

function validateTransactionFields(data: TransactionFields, ctx: z.RefinementCtx) {
  if (data.type !== "transfer" && !data.categoryId) {
    ctx.addIssue({
      code: "custom",
      message: "La categoria è obbligatoria per entrate e uscite",
      path: ["categoryId"],
    });
  }

  if (data.isRecurring) {
    const year = data.date.slice(0, 4);
    if (data.recurrenceStart && !data.recurrenceStart.startsWith(year)) {
      ctx.addIssue({
        code: "custom",
        message: "recurrenceStart deve essere nello stesso anno della data",
        path: ["recurrenceStart"],
      });
    }
    if (data.recurrenceEnd && !data.recurrenceEnd.startsWith(year)) {
      ctx.addIssue({
        code: "custom",
        message: "recurrenceEnd deve essere nello stesso anno della data",
        path: ["recurrenceEnd"],
      });
    }
    if (
      data.recurrenceStart &&
      data.recurrenceEnd &&
      data.recurrenceStart > data.recurrenceEnd
    ) {
      ctx.addIssue({
        code: "custom",
        message: "recurrenceStart non può essere dopo recurrenceEnd",
        path: ["recurrenceStart"],
      });
    }
  }
}

export const transactionInputSchema = transactionFieldsSchema.superRefine(
  validateTransactionFields
);

export const transactionSchema = transactionFieldsSchema
  .extend({ id: z.string() })
  .superRefine(validateTransactionFields);

export const transactionsFileSchema = z.object({
  transactions: z.array(transactionSchema),
});

export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionInput = z.infer<typeof transactionInputSchema>;

export type ExpandedTransaction = Transaction & {
  occurrenceId: string;
  isOccurrence: boolean;
  sourceTransactionId: string;
};

export type TransactionFilters = {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  accountId?: string;
  type?: Transaction["type"];
};
