import { STOCK_CATEGORY_COLOR, STOCK_CATEGORY_ID } from "@/lib/constants";
import type { StockHolding } from "@/lib/schemas/stock-holding";
import type { ExpandedTransaction } from "@/lib/schemas/transaction";
import type { AccumulationContribution } from "@/lib/utils/accumulation";
import {
  accumulationAsOfISO,
  filterContributionsByYear,
  postedAsOf,
  yearBounds,
} from "@/lib/utils/accumulation";
import { todayISO } from "@/lib/utils/dates";

function getYearFromDate(date: string): number {
  return parseInt(date.slice(0, 4), 10);
}

export function expandHoldingPurchases(
  holding: StockHolding,
  rangeEnd: string,
  rangeStart?: string
): AccumulationContribution[] {
  const result: AccumulationContribution[] = [];
  for (const purchase of holding.purchases ?? []) {
    if (purchase.date > rangeEnd) continue;
    if (rangeStart && purchase.date < rangeStart) continue;
    result.push({
      planId: holding.id,
      occurrenceId: purchase.id,
      date: purchase.date,
      amount: purchase.amount,
      sourceAccountId: purchase.sourceAccountId,
    });
  }
  result.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.occurrenceId.localeCompare(b.occurrenceId)
  );
  return result;
}

export function expandAllPurchases(
  holdings: StockHolding[],
  rangeEnd: string,
  rangeStart?: string
): AccumulationContribution[] {
  return holdings.flatMap((holding) =>
    expandHoldingPurchases(holding, rangeEnd, rangeStart)
  );
}

export function purchasesForYear(
  holdings: StockHolding[],
  year: number
): AccumulationContribution[] {
  const { end } = yearBounds(year);
  return filterContributionsByYear(expandAllPurchases(holdings, end), year);
}

export function postedPurchasesForYear(
  holdings: StockHolding[],
  year: number,
  asOfISO: string = accumulationAsOfISO(year)
): AccumulationContribution[] {
  return postedAsOf(purchasesForYear(holdings, year), asOfISO);
}

export function lifetimePostedPurchases(
  holding: StockHolding,
  asOfISO: string = todayISO()
): AccumulationContribution[] {
  return postedAsOf(expandHoldingPurchases(holding, asOfISO), asOfISO);
}

export function purchaseYears(holdings: StockHolding[]): number[] {
  const years = new Set<number>();
  for (const holding of holdings) {
    for (const purchase of holding.purchases ?? []) {
      const year = getYearFromDate(purchase.date);
      if (!Number.isNaN(year)) years.add(year);
    }
  }
  return [...years];
}

export function holdingTotals(holding: StockHolding, asOfISO?: string) {
  const purchases = asOfISO
    ? (holding.purchases ?? []).filter((item) => item.date <= asOfISO)
    : (holding.purchases ?? []);
  const invested = purchases.reduce((sum, item) => sum + item.amount, 0);
  const quantity = purchases.reduce((sum, item) => sum + item.quantity, 0);
  const averagePriceCents =
    quantity > 0 ? Math.round(invested / quantity) : 0;
  return { invested, quantity, averagePriceCents };
}

export function toStockSyntheticExpenses(
  contributions: AccumulationContribution[]
): ExpandedTransaction[] {
  return contributions.map((item) => ({
    id: item.occurrenceId,
    date: item.date,
    amount: item.amount,
    type: "expense",
    categoryId: STOCK_CATEGORY_ID,
    accountId: item.sourceAccountId,
    notes: "",
    tags: [],
    isRecurring: false,
    occurrenceId: item.occurrenceId,
    isOccurrence: true,
    sourceTransactionId: item.planId,
  }));
}

export function stockCategory(name: string) {
  return {
    id: STOCK_CATEGORY_ID,
    name,
    type: "expense" as const,
    color: STOCK_CATEGORY_COLOR,
    icon: "trending-up",
  };
}
