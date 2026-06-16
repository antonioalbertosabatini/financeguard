import { z } from "zod";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

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
        message: "Il conto di origine e destinazione devono essere diversi",
        path: ["toAccountId"],
      });
    }
  });

export const accountTransferInputSchema = accountTransferFieldsSchema;

export const accountTransferSchema = accountTransferFieldsSchema.extend({
  id: z.string().min(1),
});

export const accountTransfersFileSchema = z.object({
  transfers: z.array(accountTransferSchema),
});

export type AccountTransfer = z.infer<typeof accountTransferSchema>;
export type AccountTransferInput = z.infer<typeof accountTransferInputSchema>;

export type AccountTransferFilters = {
  dateFrom?: string;
  dateTo?: string;
  fromAccountId?: string;
  toAccountId?: string;
  query?: string;
};
