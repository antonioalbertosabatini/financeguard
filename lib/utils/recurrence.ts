import type {
  ExpandedTransaction,
  Transaction,
  TransactionFilters,
} from "@/lib/schemas/transaction";
import type { Language } from "@/lib/i18n/config";
import { getCurrentLanguage } from "@/lib/i18n/runtime";
import { getMonthLabels } from "@/lib/i18n/translate";
import {
  getDayFromDate,
  getDaysInMonth,
  getMonthFromDate,
  toISODate,
} from "@/lib/utils/dates";
import { matchesUiFilters, toUiFilters } from "@/lib/utils/transaction-filters";

function monthLabel(month: number, language: Language = getCurrentLanguage()): string {
  return getMonthLabels(language)[month - 1].toLowerCase();
}

export function getRecurrenceIntervalLabel(
  transaction: Transaction,
  year: number,
  language: Language = getCurrentLanguage()
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

  if (startMonth === endMonth) {
    return `${monthLabel(startMonth, language)} ${y}`;
  }
  return `${monthLabel(startMonth, language)}–${monthLabel(endMonth, language)} ${y}`;
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
  const ui = toUiFilters(filters);
  return transactions.filter((tx) => matchesUiFilters(tx, ui));
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

export function getOccurrenceMonthLabel(
  date: string,
  year: number,
  language: Language = getCurrentLanguage()
): string {
  return `${monthLabel(getMonthFromDate(date), language)} ${year}`;
}

export function filterRawTransactions(
  transactions: Transaction[],
  filters?: Omit<TransactionFilters, "dateFrom" | "dateTo">
): Transaction[] {
  if (!filters) return transactions;
  const ui = toUiFilters(filters);
  return transactions.filter((tx) => matchesUiFilters(tx, ui));
}
