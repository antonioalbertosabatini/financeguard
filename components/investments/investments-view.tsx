"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { TradeForm, type TradeFormValues } from "@/components/investments/trade-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormatCents } from "@/hooks/use-format-cents";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import {
  createTrade,
  deleteTrade,
  findOrCreateInstrument,
  setManualPrice,
} from "@/lib/actions/investments";
import { canReachCorsRestrictedSources } from "@/lib/market";
import { getQuoteProviderId } from "@/lib/market/config";
import type { Account } from "@/lib/schemas/account";
import type { Settings } from "@/lib/schemas/settings";
import { formatErrorMessage } from "@/lib/i18n/translate";
import { useI18n } from "@/providers/i18n-provider";
import { getYearFromDate } from "@/lib/db/index";
import { formatDate } from "@/lib/utils/dates";
import {
  summarizePortfolio,
  valuePositions,
  type Position,
  type ValuedPosition,
} from "@/lib/utils/portfolio";
import {
  formatUnitPrice,
  formatUnits,
  toUnits,
  unitsToInputString,
} from "@/lib/utils/quantity";
import { cn } from "@/lib/utils";

function SummaryCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "text-xl font-semibold tabular-nums sm:text-2xl",
            tone === "positive" && "text-emerald-600 dark:text-emerald-400",
            tone === "negative" && "text-destructive"
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export function InvestmentsView({
  positions,
  accounts,
  settings,
}: {
  positions: Position[];
  accounts: Account[];
  settings: Settings;
}) {
  const { t, language } = useI18n();
  const formatAmount = useFormatCents();

  const instruments = useMemo(
    () => positions.map((position) => position.instrument),
    [positions]
  );
  const { quotes, rates, loading, hasErrors, refresh } = useMarketQuotes(
    instruments,
    settings
  );

  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<ValuedPosition | null>(null);
  const [manualPrice, setManualPriceInput] = useState("");
  const [deleting, setDeleting] = useState<{ id: string; date: string } | null>(
    null
  );

  const valued = useMemo(
    () => valuePositions(positions, quotes, rates),
    [positions, quotes, rates]
  );
  const summary = useMemo(() => summarizePortfolio(valued), [valued]);

  const open = valued.filter((position) => position.quantity8 > 0);
  const closed = valued.filter((position) => position.quantity8 === 0);

  const lastAsOf = useMemo(() => {
    const dates = open
      .map((position) => position.quote?.asOf)
      .filter((value): value is string => Boolean(value));
    return dates.length > 0 ? dates.sort().at(-1) : undefined;
  }, [open]);

  // Nel browser il provider predefinito viene bloccato dal CORS: va detto
  // esplicitamente, altrimenti l'assenza di prezzi sembra un errore dell'app.
  const providerBlocked =
    getQuoteProviderId() === "yahoo" && !canReachCorsRestrictedSources();

  const detailValued = detail
    ? (valued.find((item) => item.instrument.id === detail.instrument.id) ??
      detail)
    : null;

  async function handleCreate(values: TradeFormValues) {
    try {
      const instrument = await findOrCreateInstrument({
        ...values.instrument,
        isin: "",
        manualPrice8: null,
        manualPriceAt: null,
      });
      await createTrade({
        instrumentId: instrument.id,
        date: values.date,
        side: values.side,
        quantity8: values.quantity8,
        price8: values.price8,
        feesCents: values.feesCents,
        cashCents: values.cashCents,
        accountId: values.accountId,
        notes: values.notes,
      });
      setFormOpen(false);
      toast.success(t("investments.tradeCreated"));
    } catch (error) {
      toast.error(formatErrorMessage(language, error));
    }
  }

  async function handleManualPrice() {
    if (!detailValued) return;
    try {
      const units = toUnits(manualPrice);
      await setManualPrice(detailValued.instrument.id, units > 0 ? units : null);
      toast.success(t("investments.manualPriceSaved"));
    } catch (error) {
      toast.error(formatErrorMessage(language, error));
    }
  }

  async function handleDeleteTrade() {
    if (!deleting) return;
    try {
      await deleteTrade(deleting.id, getYearFromDate(deleting.date));
      setDeleting(null);
      setDetail(null);
      toast.success(t("investments.tradeDeleted"));
    } catch (error) {
      toast.error(formatErrorMessage(language, error));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("investments.title")}
        description={t("investments.description")}
        actions={
          <>
            <Button
              variant="outline"
              onClick={refresh}
              disabled={loading || instruments.length === 0}
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              {loading ? t("investments.refreshing") : t("investments.refresh")}
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              {t("investments.new")}
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title={t("investments.totalValue")}
          value={formatAmount(summary.valueCents, settings.defaultCurrency)}
        />
        <SummaryCard
          title={t("investments.totalCost")}
          value={formatAmount(summary.costCents, settings.defaultCurrency)}
        />
        <SummaryCard
          title={t("investments.unrealized")}
          value={formatAmount(
            summary.unrealizedCents,
            settings.defaultCurrency
          )}
          tone={summary.unrealizedCents >= 0 ? "positive" : "negative"}
        />
        <SummaryCard
          title={t("investments.realized")}
          value={formatAmount(summary.realizedCents, settings.defaultCurrency)}
          tone={summary.realizedCents >= 0 ? "positive" : "negative"}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {lastAsOf
          ? t("investments.updatedAt", {
              date: formatDate(lastAsOf.slice(0, 10), settings.locale),
            })
          : t("investments.neverUpdated")}
      </p>

      {providerBlocked && (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {t("investments.providerUnavailableHere")}
        </p>
      )}
      {hasErrors && !providerBlocked && (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {t("investments.providerError")}
        </p>
      )}
      {summary.hasMissingQuotes && (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {t("investments.quotesUnavailable")}
        </p>
      )}

      {open.length === 0 && closed.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <TrendingUp className="size-8 text-muted-foreground" />
            <p className="font-medium">{t("investments.emptyTitle")}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t("investments.emptyDescription")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <PositionsTable
          positions={open}
          currency={settings.defaultCurrency}
          locale={settings.locale}
          onSelect={(position) => {
            setDetail(position);
            setManualPriceInput(
              position.instrument.manualPrice8
                ? unitsToInputString(position.instrument.manualPrice8)
                : ""
            );
          }}
        />
      )}

      {closed.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t("investments.closedPositions")}
          </h3>
          <PositionsTable
            positions={closed}
            currency={settings.defaultCurrency}
            locale={settings.locale}
            onSelect={setDetail}
          />
        </section>
      )}

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("investments.new")}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <TradeForm
              accounts={accounts}
              rates={rates}
              onSubmit={handleCreate}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={detailValued !== null}
        onOpenChange={(next) => !next && setDetail(null)}
      >
        <SheetContent className="sm:max-w-lg">
          {detailValued && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {t("investments.detailTitle", {
                    name: detailValued.instrument.name,
                  })}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6 overflow-y-auto px-4 pb-6">
                <section className="space-y-2">
                  <h4 className="text-sm font-medium">
                    {t("investments.lots")}
                  </h4>
                  {detailValued.lots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("investments.lotsEmpty")}
                    </p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {detailValued.lots.map((lot) => (
                        <li
                          key={lot.tradeId}
                          className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5"
                        >
                          <span className="text-muted-foreground">
                            {formatDate(lot.date, settings.locale)}
                          </span>
                          <span className="tabular-nums">
                            {formatUnits(lot.quantity8, settings.locale)}
                          </span>
                          <span className="tabular-nums">
                            {formatAmount(
                              lot.costCents,
                              settings.defaultCurrency
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="space-y-2">
                  <h4 className="text-sm font-medium">
                    {t("investments.operations")}
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {detailValued.trades.map((trade) => (
                      <li
                        key={trade.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5"
                      >
                        <span className="text-muted-foreground">
                          {formatDate(trade.date, settings.locale)}
                        </span>
                        <span>{t(`investments.side.${trade.side}`)}</span>
                        <span className="tabular-nums">
                          {formatUnits(trade.quantity8, settings.locale)}
                        </span>
                        <span className="tabular-nums">
                          {formatAmount(
                            trade.cashCents,
                            settings.defaultCurrency
                          )}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("investments.tradeDeleteConfirm")}
                          onClick={() =>
                            setDeleting({ id: trade.id, date: trade.date })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="space-y-2">
                  <h4 className="text-sm font-medium">
                    {t("investments.manualPriceTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t("investments.manualPriceDescription")}
                  </p>
                  <Label htmlFor="manual-price" className="sr-only">
                    {t("investments.manualPriceLabel", {
                      currency: detailValued.instrument.currency,
                    })}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="manual-price"
                      inputMode="decimal"
                      value={manualPrice}
                      onChange={(e) => setManualPriceInput(e.target.value)}
                      placeholder={detailValued.instrument.currency}
                    />
                    <Button onClick={handleManualPrice}>
                      {t("investments.manualPriceSave")}
                    </Button>
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("investments.tradeDeleteConfirm")}</DialogTitle>
            <DialogDescription>
              {t("investments.tradeDeleteConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteTrade}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PositionsTable({
  positions,
  currency,
  locale,
  onSelect,
}: {
  positions: ValuedPosition[];
  currency: string;
  locale: string;
  onSelect: (position: ValuedPosition) => void;
}) {
  const { t } = useI18n();
  const formatAmount = useFormatCents();

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("investments.form.symbol")}</TableHead>
              <TableHead className="text-right">
                {t("investments.quantity")}
              </TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                {t("investments.averageCost")}
              </TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                {t("investments.lastPrice")}
              </TableHead>
              <TableHead className="text-right">
                {t("investments.value")}
              </TableHead>
              <TableHead className="text-right">
                {t("investments.unrealized")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => (
              <TableRow
                key={position.instrument.id}
                className="cursor-pointer"
                onClick={() => onSelect(position)}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {position.instrument.ticker}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {position.instrument.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatUnits(position.quantity8, locale)}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">
                  {formatUnitPrice(position.averageCost8, currency, locale)}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">
                  {position.quote ? (
                    <span className="inline-flex items-center gap-1">
                      {formatUnitPrice(
                        position.quote.price8,
                        position.quote.currency,
                        locale
                      )}
                      {position.quote.source === "manual" && (
                        <span className="rounded bg-muted px-1 text-[10px] uppercase text-muted-foreground">
                          {t("investments.manualBadge")}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t("investments.noQuote")}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {position.valueCents === null
                    ? "—"
                    : formatAmount(position.valueCents, currency)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    position.unrealizedCents !== null &&
                      (position.unrealizedCents >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive")
                  )}
                >
                  {position.unrealizedCents === null
                    ? "—"
                    : formatAmount(position.unrealizedCents, currency)}
                  {position.unrealizedPercent !== null && (
                    <span className="ml-1 text-xs opacity-70">
                      ({position.unrealizedPercent >= 0 ? "+" : ""}
                      {position.unrealizedPercent.toFixed(1)}%)
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
