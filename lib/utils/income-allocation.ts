import {
  emptyPeriodAssignments,
  INCOME_ALLOCATION_BUCKET_IDS,
  type IncomeAllocationAssignments,
  type IncomeAllocationBucketId,
  type IncomeAllocationPercents,
  type IncomeAllocationPeriodAssignments,
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

export function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function occupancyMap(
  assignments: IncomeAllocationPeriodAssignments
): Map<string, IncomeAllocationBucketId> {
  const map = new Map<string, IncomeAllocationBucketId>();
  for (const bucket of INCOME_ALLOCATION_BUCKET_IDS) {
    for (const id of assignments[bucket]) {
      if (!map.has(id)) map.set(id, bucket);
    }
  }
  return map;
}

export function sanitizePeriodAssignments(
  stored: IncomeAllocationPeriodAssignments | undefined,
  validExpenseIds: Set<string>,
  accumulationIds: Set<string>
): IncomeAllocationPeriodAssignments {
  const seen = new Set<string>();
  const result = emptyPeriodAssignments();
  for (const bucket of INCOME_ALLOCATION_BUCKET_IDS) {
    for (const id of stored?.[bucket] ?? []) {
      if (accumulationIds.has(id)) continue;
      if (!validExpenseIds.has(id)) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      result[bucket].push(id);
    }
  }
  return result;
}

export function persistPeriodAssignments(
  allAssignments: IncomeAllocationAssignments,
  year: number,
  month: number,
  bucketId: IncomeAllocationBucketId,
  selectedIds: string[],
  validExpenseIds: Set<string>,
  accumulationIds: Set<string>
): IncomeAllocationAssignments {
  const key = periodKey(year, month);
  const current = sanitizePeriodAssignments(
    allAssignments[key],
    validExpenseIds,
    accumulationIds
  );
  const selected = [
    ...new Set(
      selectedIds.filter(
        (id) => validExpenseIds.has(id) && !accumulationIds.has(id)
      )
    ),
  ];
  const selectedSet = new Set(selected);
  for (const bucket of INCOME_ALLOCATION_BUCKET_IDS) {
    current[bucket] = current[bucket].filter((id) => !selectedSet.has(id));
  }
  current[bucketId] = selected;

  const next = { ...allAssignments };
  const isEmpty = INCOME_ALLOCATION_BUCKET_IDS.every(
    (id) => current[id].length === 0
  );
  if (isEmpty) {
    delete next[key];
  } else {
    next[key] = current;
  }
  return next;
}

export function spentByBucket(
  amountByOccurrence: Map<string, number>,
  assignments: IncomeAllocationPeriodAssignments,
  accumulationIds: string[]
): IncomeAllocationAmounts {
  const spent = emptyAmounts();
  for (const bucket of INCOME_ALLOCATION_BUCKET_IDS) {
    for (const id of assignments[bucket]) {
      spent[bucket] += amountByOccurrence.get(id) ?? 0;
    }
  }
  for (const id of accumulationIds) {
    spent.longTerm += amountByOccurrence.get(id) ?? 0;
  }
  return spent;
}

export type AllocationBucketProgress = {
  target: number;
  spent: number;
  remaining: number;
};

export function bucketProgress(
  targets: IncomeAllocationAmounts,
  spent: IncomeAllocationAmounts
): Record<IncomeAllocationBucketId, AllocationBucketProgress> {
  const result = {} as Record<
    IncomeAllocationBucketId,
    AllocationBucketProgress
  >;
  for (const id of INCOME_ALLOCATION_BUCKET_IDS) {
    result[id] = {
      target: targets[id],
      spent: spent[id],
      remaining: targets[id] - spent[id],
    };
  }
  return result;
}
