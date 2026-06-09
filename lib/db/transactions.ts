import {
  generateId,
  getDb,
  getTransactionFilePath,
  getYearFromDate,
  listTransactionYears,
} from "@/lib/db/index";
import {
  transactionSchema,
  transactionsFileSchema,
  type Transaction,
  type TransactionInput,
} from "@/lib/schemas/transaction";

const DEFAULT = { transactions: [] as Transaction[] };

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
  const filePath = getTransactionFilePath(year);
  const db = await getDb(filePath, DEFAULT);
  await db.read();
  return transactionsFileSchema.parse(db.data).transactions;
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
  const year = getYearFromDate(transaction.date);
  const filePath = getTransactionFilePath(year);
  const db = await getDb(filePath, DEFAULT);
  await db.read();
  db.data.transactions.push(transaction);
  await db.write();
  return transaction;
}

export async function updateTransaction(
  id: string,
  year: number,
  input: TransactionInput
): Promise<Transaction> {
  const oldFilePath = getTransactionFilePath(year);
  const db = await getDb(oldFilePath, DEFAULT);
  await db.read();
  const index = db.data.transactions.findIndex((t) => t.id === id);
  if (index === -1) throw new Error("Transazione non trovata");

  const updated = sanitizeTransaction({ ...input, id });
  const newYear = getYearFromDate(updated.date);

  if (newYear === year) {
    db.data.transactions[index] = updated;
    await db.write();
  } else {
    db.data.transactions.splice(index, 1);
    await db.write();
    const newFilePath = getTransactionFilePath(newYear);
    const newDb = await getDb(newFilePath, DEFAULT);
    await newDb.read();
    newDb.data.transactions.push(updated);
    await newDb.write();
  }
  return updated;
}

export async function deleteTransaction(
  id: string,
  year: number
): Promise<void> {
  const filePath = getTransactionFilePath(year);
  const db = await getDb(filePath, DEFAULT);
  await db.read();
  db.data.transactions = db.data.transactions.filter((t) => t.id !== id);
  await db.write();
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

  const filePath = getTransactionFilePath(toYear);
  const db = await getDb(filePath, DEFAULT);
  await db.read();

  const existingIds = new Set(db.data.transactions.map((t) => t.id));
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
      db.data.transactions.push(sanitizeTransaction(newTx));
      copied++;
    }
  }

  await db.write();
  return copied;
}

export { listTransactionYears };
