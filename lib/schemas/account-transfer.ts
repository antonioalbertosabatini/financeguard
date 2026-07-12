import { z } from "zod";
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

export function createAccountTransferSchemas(
  t: SchemaTranslate = defaultSchemaTranslate
) {
  const accountTransferFieldsSchema = z
    .object({
      date: dateStringSchema,
      amount: z.number().int().positive(),
      fromAccountId: z.string().min(1),
      toAccountId: z.string().min(1),
      notes: z.string().optional().default(""),
    })
    .superRefine((data, ctx) => {
      if (data.fromAccountId === data.toAccountId) {
        ctx.addIssue({
          code: "custom",
          message: t("validation.transferDifferentAccounts"),
          path: ["toAccountId"],
        });
      }
    });

  const accountTransferInputSchema = accountTransferFieldsSchema;

  const accountTransferSchema = accountTransferFieldsSchema.extend({
    id: z.string().min(1),
  });

  const accountTransfersFileSchema = z.object({
    transfers: z.array(accountTransferSchema),
  });

  return {
    accountTransferInputSchema,
    accountTransferSchema,
    accountTransfersFileSchema,
  };
}

const defaultSchemas = createAccountTransferSchemas();

export const accountTransferInputSchema = defaultSchemas.accountTransferInputSchema;
export const accountTransferSchema = defaultSchemas.accountTransferSchema;
export const accountTransfersFileSchema = defaultSchemas.accountTransfersFileSchema;

export type AccountTransfer = z.infer<typeof accountTransferSchema>;
export type AccountTransferInput = z.infer<typeof accountTransferInputSchema>;

export type AccountTransferFilters = {
  dateFrom?: string;
  dateTo?: string;
  fromAccountId?: string;
  toAccountId?: string;
  query?: string;
};
