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
  year: number
): string {
  if (!transaction.isRecurring) return "";

  const y = year;

  let startMonth = transaction.recurrenceStart
    ? getMonthFromDate(transaction.recurrenceStart)
    : getMonthFromDate(transaction.date);
  let endMonth = transaction.recurrenceEnd
    ? getMonthFromDate(transaction.recurrenceEnd)
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
  year: number
): ExpandedTransaction[] {
  const result: ExpandedTransaction[] = [];

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
      : getMonthFromDate(tx.date);

    let endMonth = tx.recurrenceEnd
      ? getMonthFromDate(tx.recurrenceEnd)
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

export function filterOccurrencesForListView(
  occurrences: ExpandedTransaction[],
  year: number,
  referenceDate: Date = new Date()
): ExpandedTransaction[] {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;

  if (year > refYear) return [];
  if (year < refYear) return occurrences;

  return occurrences.filter(
    (tx) => getMonthFromDate(tx.date) <= refMonth
  );
}

export function getOccurrenceMonthLabel(date: string, year: number): string {
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
  const month = getMonthFromDate(date);
  return `${monthNames[month - 1]} ${year}`;
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
