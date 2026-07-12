import { z } from "zod";
import { TRANSACTION_TYPES } from "@/lib/constants";
import { getCurrentLanguage } from "@/lib/i18n/runtime";
import { translate } from "@/lib/i18n/translate";
import type { MessageKey, TranslateParams } from "@/lib/i18n/types";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export type SchemaTranslate = (
  key: MessageKey,
  params?: TranslateParams
) => string;

function defaultSchemaTranslate(key: MessageKey, params?: TranslateParams) {
  return translate(getCurrentLanguage(), key, params);
}

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

function validateTransactionFields(
  data: TransactionFields,
  ctx: z.RefinementCtx,
  t: SchemaTranslate
) {
  if (data.type !== "transfer" && !data.categoryId) {
    ctx.addIssue({
      code: "custom",
      message: t("validation.categoryRequired"),
      path: ["categoryId"],
    });
  }

  if (data.isRecurring) {
    const year = data.date.slice(0, 4);
    if (data.recurrenceStart && !data.recurrenceStart.startsWith(year)) {
      ctx.addIssue({
        code: "custom",
        message: t("validation.recurrenceStartSameYear"),
        path: ["recurrenceStart"],
      });
    }
    if (data.recurrenceEnd && !data.recurrenceEnd.startsWith(year)) {
      ctx.addIssue({
        code: "custom",
        message: t("validation.recurrenceEndSameYear"),
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
        message: t("validation.recurrenceStartBeforeEnd"),
        path: ["recurrenceStart"],
      });
    }
  }
}

export function createTransactionSchemas(t: SchemaTranslate = defaultSchemaTranslate) {
  const transactionInputSchema = transactionFieldsSchema.superRefine((data, ctx) =>
    validateTransactionFields(data, ctx, t)
  );

  const transactionSchema = transactionFieldsSchema
    .extend({ id: z.string() })
    .superRefine((data, ctx) => validateTransactionFields(data, ctx, t));

  const transactionsFileSchema = z.object({
    transactions: z.array(transactionSchema),
  });

  return { transactionInputSchema, transactionSchema, transactionsFileSchema };
}

const defaultSchemas = createTransactionSchemas();

export const transactionInputSchema = defaultSchemas.transactionInputSchema;
export const transactionSchema = defaultSchemas.transactionSchema;
export const transactionsFileSchema = defaultSchemas.transactionsFileSchema;

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
