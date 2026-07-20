import type { TransactionFilters } from "@/lib/schemas/transaction";
import { normalizeTag } from "@/lib/utils/tags";

export type MatchMode = "any" | "all";

export type UiTransactionFilters = {
  dateFrom: string;
  dateTo: string;
  categoryIds: string[];
  accountIds: string[];
  types: string[];
  tags: string[];
  tagsMatch: MatchMode;
  amountMinCents: number | null;
  amountMaxCents: number | null;
};

export const EMPTY_UI_FILTERS: UiTransactionFilters = {
  dateFrom: "",
  dateTo: "",
  categoryIds: [],
  accountIds: [],
  types: [],
  tags: [],
  tagsMatch: "any",
  amountMinCents: null,
  amountMaxCents: null,
};

/** Maps API/DB TransactionFilters (legacy single + new multi) to UI filter shape. */
export function toUiFilters(filters: TransactionFilters): UiTransactionFilters {
  return {
    dateFrom: filters.dateFrom ?? "",
    dateTo: filters.dateTo ?? "",
    categoryIds:
      filters.categoryIds ??
      (filters.categoryId ? [filters.categoryId] : []),
    accountIds:
      filters.accountIds ?? (filters.accountId ? [filters.accountId] : []),
    types: filters.types ?? (filters.type ? [filters.type] : []),
    tags: filters.tags ?? [],
    tagsMatch: filters.tagsMatch ?? "any",
    amountMinCents: filters.amountMinCents ?? null,
    amountMaxCents: filters.amountMaxCents ?? null,
  };
}

export type FilterableTransaction = {
  date: string;
  amount: number;
  type: string;
  categoryId: string | null;
  accountId: string;
  tags?: string[];
};

export function matchesUiFilters(
  tx: FilterableTransaction,
  filters: UiTransactionFilters
): boolean {
  if (filters.dateFrom && tx.date < filters.dateFrom) return false;
  if (filters.dateTo && tx.date > filters.dateTo) return false;

  if (
    filters.categoryIds.length > 0 &&
    (tx.categoryId === null || !filters.categoryIds.includes(tx.categoryId))
  ) {
    return false;
  }

  if (
    filters.accountIds.length > 0 &&
    !filters.accountIds.includes(tx.accountId)
  ) {
    return false;
  }

  if (filters.types.length > 0 && !filters.types.includes(tx.type)) {
    return false;
  }

  if (filters.tags.length > 0) {
    const txTags = new Set((tx.tags ?? []).map(normalizeTag).filter(Boolean));
    const selected = filters.tags.map(normalizeTag).filter(Boolean);
    if (selected.length > 0) {
      if (filters.tagsMatch === "all") {
        if (!selected.every((tag) => txTags.has(tag))) return false;
      } else if (!selected.some((tag) => txTags.has(tag))) {
        return false;
      }
    }
  }

  if (filters.amountMinCents !== null && tx.amount < filters.amountMinCents) {
    return false;
  }
  if (filters.amountMaxCents !== null && tx.amount > filters.amountMaxCents) {
    return false;
  }

  return true;
}

export type AmountSummary = {
  income: number;
  expense: number;
  net: number;
  count: number;
};

export type MonthlySummary = AmountSummary & {
  monthKey: string;
};

function emptySummary(): AmountSummary {
  return { income: 0, expense: 0, net: 0, count: 0 };
}

function addToSummary(summary: AmountSummary, type: string, amount: number) {
  summary.count += 1;
  if (type === "income") summary.income += amount;
  if (type === "expense") summary.expense += amount;
  summary.net = summary.income - summary.expense;
}

export function summarizeTransactions(
  items: Array<{ type: string; amount: number }>
): AmountSummary {
  const summary = emptySummary();
  for (const item of items) {
    addToSummary(summary, item.type, item.amount);
  }
  return summary;
}

export function summarizeByMonth(
  items: Array<{ date: string; type: string; amount: number }>
): MonthlySummary[] {
  const map = new Map<string, AmountSummary>();

  for (const item of items) {
    const monthKey = item.date.slice(0, 7);
    let summary = map.get(monthKey);
    if (!summary) {
      summary = emptySummary();
      map.set(monthKey, summary);
    }
    addToSummary(summary, item.type, item.amount);
  }

  return Array.from(map.entries())
    .map(([monthKey, summary]) => ({ monthKey, ...summary }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

export function countActiveUiFilters(filters: UiTransactionFilters): number {
  return (
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    filters.categoryIds.length +
    filters.accountIds.length +
    filters.types.length +
    filters.tags.length +
    (filters.tags.length > 0 && filters.tagsMatch === "all" ? 1 : 0) +
    (filters.amountMinCents !== null ? 1 : 0) +
    (filters.amountMaxCents !== null ? 1 : 0)
  );
}
