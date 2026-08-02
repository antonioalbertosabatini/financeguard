import { z } from "zod";
import { TRADE_SIDES } from "@/lib/constants";
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

const tradeFieldsSchema = z.object({
  instrumentId: z.string().min(1),
  date: dateStringSchema,
  side: z.enum(TRADE_SIDES),
  /** Quantita' in unita' scalate 1e8: le crypto richiedono molti decimali. */
  quantity8: z.number().int().positive(),
  /** Prezzo unitario scalato 1e8, nella valuta dello strumento. */
  price8: z.number().int().nonnegative(),
  feesCents: z.number().int().nonnegative().optional().default(0),
  /**
   * Contante realmente movimentato sul conto, in centesimi di euro. E'
   * indipendente da quantita' x prezzo perche' evita di dover ricostruire il
   * cambio storico: lo si legge dall'estratto conto.
   */
  cashCents: z.number().int().nonnegative(),
  accountId: z.string().min(1),
  notes: z.string().optional().default(""),
});

type TradeFields = z.infer<typeof tradeFieldsSchema>;

function validateTradeFields(
  data: TradeFields,
  ctx: z.RefinementCtx,
  t: SchemaTranslate
) {
  if (data.side === "buy" && data.cashCents === 0) {
    ctx.addIssue({
      code: "custom",
      message: t("investments.form.cashRequired"),
      path: ["cashCents"],
    });
  }
}

export function createTradeSchemas(t: SchemaTranslate = defaultSchemaTranslate) {
  const tradeInputSchema = tradeFieldsSchema.superRefine((data, ctx) =>
    validateTradeFields(data, ctx, t)
  );

  const tradeSchema = tradeFieldsSchema
    .extend({ id: z.string().min(1) })
    .superRefine((data, ctx) => validateTradeFields(data, ctx, t));

  const tradesFileSchema = z.object({ trades: z.array(tradeSchema) });

  return { tradeInputSchema, tradeSchema, tradesFileSchema };
}

const defaultSchemas = createTradeSchemas();

export const tradeInputSchema = defaultSchemas.tradeInputSchema;
export const tradeSchema = defaultSchemas.tradeSchema;
export const tradesFileSchema = defaultSchemas.tradesFileSchema;

export type Trade = z.infer<typeof tradeSchema>;
export type TradeInput = z.infer<typeof tradeInputSchema>;
export type TradeSide = Trade["side"];
