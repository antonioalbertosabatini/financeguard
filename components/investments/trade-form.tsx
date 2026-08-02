"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SymbolSearch } from "@/components/investments/symbol-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { INSTRUMENT_KINDS, TRADE_SIDES } from "@/lib/constants";
import { resolveQuoteSymbol, type SymbolResult } from "@/lib/market";
import type { Account } from "@/lib/schemas/account";
import type { Instrument } from "@/lib/schemas/instrument";
import { useI18n } from "@/providers/i18n-provider";
import { toCents } from "@/lib/utils/money";
import { convertToBaseCents, type FxRates } from "@/lib/utils/portfolio";
import { grossValueCents, toUnits } from "@/lib/utils/quantity";
import { todayISO } from "@/lib/utils/dates";

const symbolSchema = z.object({
  symbol: z.string().min(1),
  ticker: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(INSTRUMENT_KINDS),
  currency: z.string(),
  exchange: z.string(),
});

export interface TradeFormValues {
  instrument: {
    symbol: string;
    ticker: string;
    name: string;
    kind: (typeof INSTRUMENT_KINDS)[number];
    currency: string;
    exchange: string;
  };
  side: (typeof TRADE_SIDES)[number];
  date: string;
  quantity8: number;
  price8: number;
  feesCents: number;
  cashCents: number;
  accountId: string;
  notes: string;
}

function instrumentToSymbol(instrument: Instrument): SymbolResult {
  return {
    symbol: instrument.symbol,
    ticker: instrument.ticker,
    name: instrument.name,
    kind: instrument.kind,
    currency: instrument.currency,
    exchange: instrument.exchange,
  };
}

export function TradeForm({
  accounts,
  rates,
  prefill,
  onSubmit,
}: {
  accounts: Account[];
  rates: FxRates;
  /** Preimpostato quando si aggiunge un'operazione da una posizione esistente. */
  prefill?: Instrument;
  onSubmit: (values: TradeFormValues) => Promise<void>;
}) {
  const { t } = useI18n();

  const formSchema = useMemo(
    () =>
      z.object({
        kind: z.enum(INSTRUMENT_KINDS),
        symbol: symbolSchema.nullable().refine((value) => value !== null, {
          message: t("investments.form.symbolRequired"),
        }),
        side: z.enum(TRADE_SIDES),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        quantity: z.string().refine((value) => toUnits(value) > 0, {
          message: t("investments.form.quantityRequired"),
        }),
        price: z.string(),
        fees: z.string(),
        cash: z.string().refine((value) => toCents(value) > 0, {
          message: t("investments.form.cashRequired"),
        }),
        accountId: z.string().min(1, t("investments.form.accountRequired")),
        notes: z.string(),
      }),
    [t]
  );

  type FormValues = z.input<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kind: prefill?.kind ?? "etf",
      symbol: prefill ? instrumentToSymbol(prefill) : null,
      side: "buy",
      date: todayISO(),
      quantity: "",
      price: "",
      fees: "",
      cash: "",
      accountId: accounts[0]?.id ?? "",
      notes: "",
    },
  });

  const kind = form.watch("kind");
  const side = form.watch("side");
  const symbol = form.watch("symbol");
  const quantity = form.watch("quantity");
  const price = form.watch("price");
  const fees = form.watch("fees");

  // Il contante resta modificabile: la proposta serve solo a evitare di
  // rifare a mano il conto, ma in estratto conto puo' differire per spread,
  // bolli o un cambio applicato diverso da quello BCE.
  useEffect(() => {
    const quantity8 = toUnits(quantity);
    const price8 = toUnits(price);
    if (!symbol || quantity8 <= 0 || price8 <= 0) return;

    const gross = grossValueCents(quantity8, price8);
    const inEuro = convertToBaseCents(gross, symbol.currency || "EUR", rates);
    if (inEuro === null) return;

    const feesCents = toCents(fees);
    const proposal = side === "buy" ? inEuro + feesCents : inEuro - feesCents;
    form.setValue("cash", (Math.max(proposal, 0) / 100).toFixed(2), {
      shouldValidate: form.formState.isSubmitted,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, price, fees, side, symbol, rates]);

  async function handleSubmit(values: FormValues) {
    const selected = values.symbol as SymbolResult;
    // Le quotazioni possono usare una codifica del simbolo diversa da quella
    // della ricerca: si risolve ora, cosi' il record nasce gia' interrogabile.
    const quoteSymbol = await resolveQuoteSymbol(selected);

    await onSubmit({
      instrument: {
        ...selected,
        symbol: quoteSymbol,
        currency: selected.currency || "EUR",
      },
      side: values.side,
      date: values.date,
      quantity8: toUnits(values.quantity),
      price8: toUnits(values.price),
      feesCents: toCents(values.fees),
      cashCents: toCents(values.cash),
      accountId: values.accountId,
      notes: values.notes,
    });
  }

  const currencyLabel = symbol?.currency || "EUR";

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-4 overflow-y-auto"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("investments.form.kind")}</Label>
          <Controller
            control={form.control}
            name="kind"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  if (!prefill) form.setValue("symbol", null);
                }}
                disabled={Boolean(prefill)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSTRUMENT_KINDS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(`investments.kind.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("investments.form.side")}</Label>
          <Controller
            control={form.control}
            name="side"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_SIDES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(`investments.side.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("investments.form.symbol")}</Label>
        <Controller
          control={form.control}
          name="symbol"
          render={({ field }) => (
            <SymbolSearch
              // Cambiare tipo di strumento azzera ricerca e risultati.
              key={kind}
              kind={kind}
              value={field.value as SymbolResult | null}
              onSelect={field.onChange}
            />
          )}
        />
        {form.formState.errors.symbol && (
          <p className="text-sm text-destructive">
            {form.formState.errors.symbol.message as string}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="trade-date">{t("investments.form.date")}</Label>
          <Input id="trade-date" type="date" {...form.register("date")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trade-quantity">
            {t("investments.form.quantity")}
          </Label>
          <Input
            id="trade-quantity"
            inputMode="decimal"
            placeholder="0"
            {...form.register("quantity")}
          />
          {form.formState.errors.quantity && (
            <p className="text-sm text-destructive">
              {form.formState.errors.quantity.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="trade-price">
            {t("investments.form.price")} ({currencyLabel})
          </Label>
          <Input
            id="trade-price"
            inputMode="decimal"
            placeholder="0,00"
            {...form.register("price")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trade-fees">{t("investments.form.fees")}</Label>
          <Input
            id="trade-fees"
            inputMode="decimal"
            placeholder="0,00"
            {...form.register("fees")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="trade-cash">{t("investments.form.cash")}</Label>
        <Input
          id="trade-cash"
          inputMode="decimal"
          placeholder="0,00"
          {...form.register("cash")}
        />
        <p className="text-xs text-muted-foreground">
          {side === "buy"
            ? t("investments.form.cashHintBuy")
            : t("investments.form.cashHintSell")}
        </p>
        {form.formState.errors.cash && (
          <p className="text-sm text-destructive">
            {form.formState.errors.cash.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("investments.form.account")}</Label>
        <Controller
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.accountId && (
          <p className="text-sm text-destructive">
            {form.formState.errors.accountId.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="trade-notes">{t("investments.form.notes")}</Label>
        <Textarea
          id="trade-notes"
          rows={2}
          placeholder={t("investments.form.notesPlaceholder")}
          {...form.register("notes")}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={form.formState.isSubmitting}
      >
        {t("investments.form.submit")}
      </Button>
    </form>
  );
}
