import { z } from "zod";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const stockPurchaseSchema = z.object({
  id: z.string().min(1),
  date: dateStringSchema,
  amount: z.number().int().positive(),
  quantity: z.number().positive().finite(),
  sourceAccountId: z.string().min(1),
});

const stockHoldingFieldsSchema = z.object({
  name: z.string().min(1),
  purchases: z.array(stockPurchaseSchema).default([]),
});

export const stockHoldingSchema = stockHoldingFieldsSchema.extend({
  id: z.string().min(1),
});

export const stockHoldingInputSchema = stockHoldingFieldsSchema.omit({
  purchases: true,
});

export const addStockPurchaseSchema = z.object({
  amount: z.number().int().positive(),
  quantity: z.number().positive().finite(),
  date: dateStringSchema,
  sourceAccountId: z.string().min(1),
});

export const removeStockPurchaseSchema = z.object({
  purchaseId: z.string().min(1),
});

export const stockHoldingsFileSchema = z.object({
  stockHoldings: z.array(stockHoldingSchema),
});

export type StockHolding = z.infer<typeof stockHoldingSchema>;
export type StockHoldingInput = z.infer<typeof stockHoldingInputSchema>;
export type StockPurchase = z.infer<typeof stockPurchaseSchema>;
export type AddStockPurchaseInput = z.infer<typeof addStockPurchaseSchema>;
