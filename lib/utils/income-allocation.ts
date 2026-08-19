import {
  INCOME_ALLOCATION_BUCKET_IDS,
  type IncomeAllocationBucketId,
  type IncomeAllocationPercents,
} from "@/lib/schemas/settings";
import type { ExpandedTransaction } from "@/lib/schemas/transaction";

export type IncomeAllocationAmounts = Record<IncomeAllocationBucketId, number>;

export function sumAllocationPercents(
  percents: IncomeAllocationPercents
): number {
  return INCOME_ALLOCATION_BUCKET_IDS.reduce(
    (sum, id) => sum + percents[id],
    0
  );
}

export function areAllocationPercentsValid(
  percents: IncomeAllocationPercents
): boolean {
  return (
    sumAllocationPercents(percents) === 100 &&
    INCOME_ALLOCATION_BUCKET_IDS.every(
      (id) => Number.isInteger(percents[id]) && percents[id] >= 0 && percents[id] <= 100
    )
  );
}

function emptyAmounts(): IncomeAllocationAmounts {
  return {
    essentials: 0,
    discretionary: 0,
    debtOrInvest: 0,
    shortTerm: 0,
    longTerm: 0,
  };
}

/**
 * Split `totalCents` by integer percents so the bucket amounts sum to the
 * total (Hamilton / largest-remainder method).
 */
export function allocateCents(
  totalCents: number,
  percents: IncomeAllocationPercents
): IncomeAllocationAmounts {
  const amounts = emptyAmounts();
  if (totalCents <= 0) return amounts;

  const rows = INCOME_ALLOCATION_BUCKET_IDS.map((id, index) => {
    const exact = (totalCents * percents[id]) / 100;
    const floor = Math.floor(exact);
    return { id, index, floor, remainder: exact - floor };
  });

  const leftover = totalCents - rows.reduce((sum, row) => sum + row.floor, 0);
  const ranked = [...rows].sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    return a.index - b.index;
  });

  for (const row of rows) amounts[row.id] = row.floor;
  for (let i = 0; i < leftover && i < ranked.length; i++) {
    amounts[ranked[i].id] += 1;
  }
  return amounts;
}

export function filterIncomeTransactions(
  transactions: ExpandedTransaction[],
  incomeCategoryIds: string[]
): ExpandedTransaction[] {
  const income = transactions.filter((tx) => tx.type === "income");
  if (incomeCategoryIds.length === 0) return income;
  const allowed = new Set(incomeCategoryIds);
  return income.filter(
    (tx) => tx.categoryId != null && allowed.has(tx.categoryId)
  );
}

export function sumIncomeCents(transactions: ExpandedTransaction[]): number {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

/** Empty stored list means “all current (and future) income categories”. */
export function resolveIncomeCategoryIds(
  storedIds: string[],
  currentIncomeCategoryIds: string[]
): string[] {
  if (storedIds.length === 0) return currentIncomeCategoryIds;
  const current = new Set(currentIncomeCategoryIds);
  const resolved = storedIds.filter((id) => current.has(id));
  return resolved.length === 0 ? currentIncomeCategoryIds : resolved;
}

export function persistIncomeCategoryIds(
  selectedIds: string[],
  currentIncomeCategoryIds: string[]
): string[] {
  if (selectedIds.length === 0) return [];
  if (
    selectedIds.length === currentIncomeCategoryIds.length &&
    currentIncomeCategoryIds.every((id) => selectedIds.includes(id))
  ) {
    return [];
  }
  return selectedIds;
}
