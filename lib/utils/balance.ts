import type { Account } from "@/lib/schemas/account";
import type { ExpandedTransaction } from "@/lib/schemas/transaction";
import { getDaysInMonth } from "@/lib/utils/dates";

export type DailyExpenseRow = {
  day: number;
  label: string;
  [categoryName: string]: number | string;
};

export type DailyExpenseSeries = {
  key: string;
  name: string;
  color: string;
};

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

export function sumExpensesByDayAndCategory(
  transactions: ExpandedTransaction[],
  year: number,
  month: number,
  categories: { id: string; name: string; color: string }[]
): { rows: DailyExpenseRow[]; series: DailyExpenseSeries[] } {
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const totalsByCategory: Record<string, number> = {};
  const daysInMonth = getDaysInMonth(year, month);

  const rows: DailyExpenseRow[] = Array.from(
    { length: daysInMonth },
    (_, i) => {
      const day = i + 1;
      return { day, label: String(day) };
    }
  );

  for (const tx of transactions) {
    if (tx.type !== "expense" || !tx.categoryId) continue;
    const category = categoryMap[tx.categoryId];
    if (!category) continue;

    const day = parseInt(tx.date.slice(8, 10), 10);
    if (day < 1 || day > daysInMonth) continue;

    const amount = tx.amount / 100;
    const row = rows[day - 1];
    const current = (row[category.name] as number | undefined) ?? 0;
    row[category.name] = current + amount;
    totalsByCategory[category.id] =
      (totalsByCategory[category.id] ?? 0) + tx.amount;
  }

  const series = Object.entries(totalsByCategory)
    .map(([categoryId, total]) => {
      const category = categoryMap[categoryId];
      return {
        key: categoryId,
        name: category?.name ?? categoryId,
        color: category?.color ?? "#888",
        total,
      };
    })
    .sort((a, b) => b.total - a.total)
    .map(({ key, name, color }) => ({ key, name, color }));

  return { rows, series };
}
