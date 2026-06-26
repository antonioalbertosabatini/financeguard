import {
  generateId,
  getYearFromDate,
  getYearTransactions,
  listTransactionYears,
  setYearTransactions,
} from "@/lib/db/index";
import { getDataset, getDeviceId } from "@/lib/storage/data-store";
import {
  trackDelete,
  trackTransactionUpsert,
} from "@/lib/sync/sync-metadata";
import {
  transactionSchema,
  transactionsFileSchema,
  type Transaction,
  type TransactionInput,
} from "@/lib/schemas/transaction";

function sanitizeTransaction(input: TransactionInput | Transaction): Transaction {
  const base = {
    ...input,
    notes: input.notes ?? "",
    tags: input.tags ?? [],
  };
  if (!base.isRecurring) {
    delete (base as Transaction).recurrenceStart;
    delete (base as Transaction).recurrenceEnd;
  }
  return transactionSchema.parse(base);
}

export async function getTransactionsForYear(
  year: number
): Promise<Transaction[]> {
  return transactionsFileSchema.parse({
    transactions: getYearTransactions(year),
  }).transactions;
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const years = await listTransactionYears();
  const all: Transaction[] = [];
  for (const year of years) {
    const txs = await getTransactionsForYear(year);
    all.push(...txs);
  }
  return all;
}

export async function createTransaction(
  input: TransactionInput
): Promise<Transaction> {
  const transaction = sanitizeTransaction({
    ...input,
    id: generateId("tx"),
  });
  trackTransactionUpsert(getDataset(), transaction, getDeviceId());
  const year = getYearFromDate(transaction.date);
  setYearTransactions(year, [...getYearTransactions(year), transaction]);
  return transaction;
}

export async function updateTransaction(
  id: string,
  year: number,
  input: TransactionInput
): Promise<Transaction> {
  const list = [...getYearTransactions(year)];
  const index = list.findIndex((t) => t.id === id);
  if (index === -1) throw new Error("Transazione non trovata");

  const previous = list[index];
  const updated = sanitizeTransaction({ ...input, id });
  trackTransactionUpsert(getDataset(), updated, getDeviceId(), previous);
  const newYear = getYearFromDate(updated.date);

  if (newYear === year) {
    list[index] = updated;
    setYearTransactions(year, list);
  } else {
    list.splice(index, 1);
    setYearTransactions(year, list);
    setYearTransactions(newYear, [...getYearTransactions(newYear), updated]);
  }
  return updated;
}

export async function deleteTransaction(
  id: string,
  year: number
): Promise<void> {
  trackDelete(getDataset(), "transaction", id, getDeviceId());
  setYearTransactions(
    year,
    getYearTransactions(year).filter((t) => t.id !== id)
  );
}

function shiftDateToYear(date: string, targetYear: number): string {
  const [, month, day] = date.split("-");
  return `${targetYear}-${month}-${day}`;
}

export async function copyRecurringRules(
  fromYear: number,
  toYear: number
): Promise<number> {
  const source = await getTransactionsForYear(fromYear);
  const recurring = source.filter((t) => t.isRecurring);
  if (recurring.length === 0) return 0;

  const target = [...getYearTransactions(toYear)];
  const existingIds = new Set(target.map((t) => t.id));
  let copied = 0;

  for (const rule of recurring) {
    const newTx: Transaction = {
      ...rule,
      id: generateId("tx"),
      date: shiftDateToYear(rule.date, toYear),
      recurrenceStart: rule.recurrenceStart
        ? shiftDateToYear(rule.recurrenceStart, toYear)
        : undefined,
      recurrenceEnd: rule.recurrenceEnd
        ? shiftDateToYear(rule.recurrenceEnd, toYear)
        : undefined,
    };
    if (!existingIds.has(newTx.id)) {
      const sanitized = sanitizeTransaction(newTx);
      trackTransactionUpsert(getDataset(), sanitized, getDeviceId());
      target.push(sanitized);
      copied++;
    }
  }

  setYearTransactions(toYear, target);
  return copied;
}

export { listTransactionYears };
