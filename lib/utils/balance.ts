import type { Account } from "@/lib/schemas/account";
import type { ExpandedTransaction } from "@/lib/schemas/transaction";

export function getTransactionEffect(
  tx: ExpandedTransaction,
  accountId: string
): number {
  if (tx.accountId !== accountId) return 0;

  switch (tx.type) {
    case "income":
      return tx.amount;
    case "expense":
      return -tx.amount;
    case "transfer":
      return 0;
    default:
      return 0;
  }
}

export function calculateAccountBalance(
  account: Account,
  transactions: ExpandedTransaction[]
): number {
  const delta = transactions
    .filter((tx) => tx.accountId === account.id)
    .reduce((sum, tx) => sum + getTransactionEffect(tx, account.id), 0);
  return account.initialBalance + delta;
}

export function calculateTotalBalance(
  accounts: Account[],
  transactions: ExpandedTransaction[]
): number {
  return accounts.reduce(
    (sum, account) => sum + calculateAccountBalance(account, transactions),
    0
  );
}

export function sumByType(
  transactions: ExpandedTransaction[],
  type: "income" | "expense"
): number {
  return transactions
    .filter((tx) => tx.type === type)
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function sumExpensesByCategory(
  transactions: ExpandedTransaction[]
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.type !== "expense" || !tx.categoryId) continue;
    result[tx.categoryId] = (result[tx.categoryId] ?? 0) + tx.amount;
  }
  return result;
}

export function sumByMonth(
  transactions: ExpandedTransaction[],
  year: number
): { month: number; income: number; expense: number }[] {
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    expense: 0,
  }));

  for (const tx of transactions) {
    if (!tx.date.startsWith(String(year))) continue;
    const month = parseInt(tx.date.slice(5, 7), 10);
    const entry = months[month - 1];
    if (tx.type === "income") entry.income += tx.amount;
    if (tx.type === "expense") entry.expense += tx.amount;
  }

  return months;
}

export function filterByMonth(
  transactions: ExpandedTransaction[],
  year: number,
  month: number
): ExpandedTransaction[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return transactions.filter((tx) => tx.date.startsWith(prefix));
}
