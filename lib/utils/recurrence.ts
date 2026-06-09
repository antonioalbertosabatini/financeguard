import type {
  ExpandedTransaction,
  Transaction,
  TransactionFilters,
} from "@/lib/schemas/transaction";
import {
  getDayFromDate,
  getDaysInMonth,
  getMonthFromDate,
  toISODate,
} from "@/lib/utils/dates";

export function getRecurrenceIntervalLabel(
  transaction: Transaction,
  year: number,
  now = new Date()
): string {
  if (!transaction.isRecurring) return "";

  const y = year;
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  let startMonth = transaction.recurrenceStart
    ? getMonthFromDate(transaction.recurrenceStart)
    : 1;
  let endMonth = transaction.recurrenceEnd
    ? getMonthFromDate(transaction.recurrenceEnd)
    : y === nowYear
      ? nowMonth
      : 12;

  startMonth = Math.max(1, Math.min(12, startMonth));
  endMonth = Math.max(1, Math.min(12, endMonth));

  const monthNames = [
    "gen",
    "feb",
    "mar",
    "apr",
    "mag",
    "giu",
    "lug",
    "ago",
    "set",
    "ott",
    "nov",
    "dic",
  ];

  if (startMonth === endMonth) {
    return `${monthNames[startMonth - 1]} ${y}`;
  }
  return `${monthNames[startMonth - 1]}–${monthNames[endMonth - 1]} ${y}`;
}

export function expandRecurrences(
  transactions: Transaction[],
  year: number,
  now: Date = new Date()
): ExpandedTransaction[] {
  const result: ExpandedTransaction[] = [];
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  for (const tx of transactions) {
    if (!tx.isRecurring) {
      result.push({
        ...tx,
        occurrenceId: tx.id,
        isOccurrence: false,
        sourceTransactionId: tx.id,
      });
      continue;
    }

    const anchorDay = tx.recurrenceStart
      ? getDayFromDate(tx.recurrenceStart)
      : getDayFromDate(tx.date);

    let startMonth = tx.recurrenceStart
      ? getMonthFromDate(tx.recurrenceStart)
      : 1;

    let endMonth = tx.recurrenceEnd
      ? getMonthFromDate(tx.recurrenceEnd)
      : year === nowYear
        ? nowMonth
        : 12;

    startMonth = Math.max(1, Math.min(12, startMonth));
    endMonth = Math.max(1, Math.min(12, endMonth));

    if (startMonth > endMonth) continue;

    for (let month = startMonth; month <= endMonth; month++) {
      const day = Math.min(anchorDay, getDaysInMonth(year, month));
      const occurrenceDate = toISODate(year, month, day);

      if (tx.recurrenceStart && occurrenceDate < tx.recurrenceStart) continue;
      if (tx.recurrenceEnd && occurrenceDate > tx.recurrenceEnd) continue;

      result.push({
        ...tx,
        date: occurrenceDate,
        occurrenceId: `${tx.id}_${occurrenceDate}`,
        isOccurrence: true,
        sourceTransactionId: tx.id,
      });
    }
  }

  return result.sort((a, b) => b.date.localeCompare(a.date));
}

export function filterExpandedTransactions(
  transactions: ExpandedTransaction[],
  filters?: TransactionFilters
): ExpandedTransaction[] {
  if (!filters) return transactions;

  return transactions.filter((tx) => {
    if (filters.dateFrom && tx.date < filters.dateFrom) return false;
    if (filters.dateTo && tx.date > filters.dateTo) return false;
    if (filters.categoryId && tx.categoryId !== filters.categoryId) return false;
    if (filters.accountId && tx.accountId !== filters.accountId) return false;
    if (filters.type && tx.type !== filters.type) return false;
    return true;
  });
}

export function filterRawTransactions(
  transactions: Transaction[],
  filters?: Omit<TransactionFilters, "dateFrom" | "dateTo">
): Transaction[] {
  if (!filters) return transactions;
  return transactions.filter((tx) => {
    if (filters.categoryId && tx.categoryId !== filters.categoryId) return false;
    if (filters.accountId && tx.accountId !== filters.accountId) return false;
    if (filters.type && tx.type !== filters.type) return false;
    return true;
  });
}
