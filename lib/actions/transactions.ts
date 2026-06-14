"use server";

import { revalidatePath } from "next/cache";
import { getAccounts } from "@/lib/db/accounts";
import { getCategories } from "@/lib/db/categories";
import {
  copyRecurringRules,
  createTransaction as dbCreateTransaction,
  deleteTransaction as dbDeleteTransaction,
  getTransactionsForYear,
  listTransactionYears,
  updateTransaction as dbUpdateTransaction,
} from "@/lib/db/transactions";
import {
  transactionInputSchema,
  type TransactionFilters,
  type TransactionInput,
} from "@/lib/schemas/transaction";
import {
  expandRecurrences,
  filterExpandedTransactions,
  filterRawTransactions,
} from "@/lib/utils/recurrence";
import { currentYear } from "@/lib/utils/dates";
import { normalizeTag } from "@/lib/utils/tags";

export async function getAvailableYears() {
  const years = await listTransactionYears();
  const now = currentYear();
  if (!years.includes(now)) years.unshift(now);
  return [...new Set(years)].sort((a, b) => b - a);
}

export async function getTransactions(year: number, filters?: TransactionFilters) {
  const raw = await getTransactionsForYear(year);
  const filtered = filterRawTransactions(raw, filters);
  return filtered.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getExpandedTransactions(
  year: number,
  filters?: TransactionFilters
) {
  const raw = await getTransactionsForYear(year);
  const expanded = expandRecurrences(raw, year);
  return filterExpandedTransactions(expanded, filters);
}

export async function createTransaction(data: TransactionInput) {
  const parsed = transactionInputSchema.parse(data);
  const tx = await dbCreateTransaction(parsed);
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/add");
  revalidatePath("/reports");
  revalidatePath("/budget");
  return tx;
}

export async function updateTransaction(
  id: string,
  year: number,
  data: TransactionInput
) {
  const parsed = transactionInputSchema.parse(data);
  const tx = await dbUpdateTransaction(id, year, parsed);
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  revalidatePath("/budget");
  return tx;
}

export async function deleteTransaction(id: string, year: number) {
  await dbDeleteTransaction(id, year);
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  revalidatePath("/budget");
}

export async function copyRecurringFromPreviousYear(toYear: number) {
  const copied = await copyRecurringRules(toYear - 1, toYear);
  revalidatePath("/transactions");
  revalidatePath("/");
  return copied;
}

export async function getDashboardData(year: number) {
  const [accounts, categories, settings] = await Promise.all([
    getAccounts(),
    getCategories(),
    import("@/lib/db/settings").then((m) => m.getSettings()),
  ]);

  const raw = await getTransactionsForYear(year);
  const expanded = expandRecurrences(raw, year);
  const now = new Date();
  const monthPrefix = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthTxs = expanded.filter((tx) => tx.date.startsWith(monthPrefix));

  const {
    calculateTotalBalance,
    sumByType,
    sumExpensesByCategory,
    sumByMonth,
  } = await import("@/lib/utils/balance");

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return {
    settings,
    totalBalance: calculateTotalBalance(accounts, expanded),
    monthlyIncome: sumByType(monthTxs, "income"),
    monthlyExpense: sumByType(monthTxs, "expense"),
    expensesByCategory: Object.entries(sumExpensesByCategory(expanded)).map(
      ([categoryId, amount]) => ({
        categoryId,
        name: categoryMap[categoryId]?.name ?? categoryId,
        color: categoryMap[categoryId]?.color ?? "#888",
        amount,
      })
    ),
    monthlyTrend: sumByMonth(expanded, year),
  };
}

export async function getAvailableTags(year?: number) {
  const years =
    year !== undefined
      ? [year]
      : await listTransactionYears().then((ys) =>
          ys.length > 0 ? ys : [currentYear()]
        );

  const allExpanded = await Promise.all(
    years.map(async (y) => {
      const raw = await getTransactionsForYear(y);
      return expandRecurrences(raw, y);
    })
  );

  return Array.from(
    new Set(
      allExpanded
        .flat()
        .filter((tx) => tx.type === "expense")
        .flatMap((tx) => tx.tags.map(normalizeTag))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));
}

export async function getMonthlyReport(year: number, month: number) {
  const [categories, settings] = await Promise.all([
    getCategories(),
    import("@/lib/db/settings").then((m) => m.getSettings()),
  ]);

  const raw = await getTransactionsForYear(year);
  const expanded = expandRecurrences(raw, year);
  const {
    filterByMonth,
    sumByType,
    sumExpensesByCategory,
    sumExpensesByDayAndCategory,
  } = await import("@/lib/utils/balance");

  const monthTxs = filterByMonth(expanded, year, month);
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return {
    settings,
    income: sumByType(monthTxs, "income"),
    expense: sumByType(monthTxs, "expense"),
    net: sumByType(monthTxs, "income") - sumByType(monthTxs, "expense"),
    expensesByCategory: Object.entries(sumExpensesByCategory(monthTxs))
      .map(([categoryId, amount]) => ({
        categoryId,
        name: categoryMap[categoryId]?.name ?? categoryId,
        color: categoryMap[categoryId]?.color ?? "#888",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount),
    dailyExpenses: sumExpensesByDayAndCategory(
      monthTxs,
      year,
      month,
      categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))
    ),
  };
}

export async function getAnnualReport(year: number) {
  const [categories, settings] = await Promise.all([
    getCategories(),
    import("@/lib/db/settings").then((m) => m.getSettings()),
  ]);

  const raw = await getTransactionsForYear(year);
  const expanded = expandRecurrences(raw, year);
  const { sumByType, sumExpensesByCategory, sumByMonth } = await import(
    "@/lib/utils/balance"
  );

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return {
    settings,
    income: sumByType(expanded, "income"),
    expense: sumByType(expanded, "expense"),
    net: sumByType(expanded, "income") - sumByType(expanded, "expense"),
    monthlyTrend: sumByMonth(expanded, year),
    expensesByCategory: Object.entries(sumExpensesByCategory(expanded))
      .map(([categoryId, amount]) => ({
        categoryId,
        name: categoryMap[categoryId]?.name ?? categoryId,
        color: categoryMap[categoryId]?.color ?? "#888",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount),
  };
}

export async function getAccountsWithBalances(year: number) {
  const accounts = await getAccounts();
  const raw = await getTransactionsForYear(year);
  const expanded = expandRecurrences(raw, year);
  const { calculateAccountBalance } = await import("@/lib/utils/balance");

  return accounts.map((account) => ({
    ...account,
    balance: calculateAccountBalance(account, expanded),
  }));
}

export async function getBudgetProgress(year: number, month: number) {
  const [budgets, categories, settings] = await Promise.all([
    import("@/lib/db/budgets").then((m) => m.getBudgets()),
    getCategories(),
    import("@/lib/db/settings").then((m) => m.getSettings()),
  ]);

  const raw = await getTransactionsForYear(year);
  const expanded = expandRecurrences(raw, year);
  const { filterByMonth } = await import("@/lib/utils/balance");

  const monthTxs = filterByMonth(expanded, year, month);
  const expenseTxs = monthTxs.filter((tx) => tx.type === "expense");
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const availableTags = await getAvailableTags(year);

  return {
    settings,
    availableTags,
    items: budgets.map((budget) => {
      const matchingExpenses = expenseTxs.filter((tx) => {
        if (budget.categoryId && tx.categoryId !== budget.categoryId) return false;
        if (
          budget.tag &&
          !tx.tags.some((tag) => normalizeTag(tag) === budget.tag)
        ) {
          return false;
        }
        return true;
      });
      const category = budget.categoryId
        ? categoryMap[budget.categoryId]
        : undefined;

      return {
        ...budget,
        categoryName: category?.name,
        categoryColor: category?.color ?? "#888",
        categoryIcon: category?.icon,
        spent: matchingExpenses.reduce((sum, tx) => sum + tx.amount, 0),
        expenses: matchingExpenses.map((tx) => {
          const txCategory = tx.categoryId ? categoryMap[tx.categoryId] : undefined;
          return {
            id: tx.occurrenceId,
            amount: tx.amount,
            tags: tx.tags,
            categoryId: tx.categoryId,
            categoryName: txCategory?.name ?? tx.categoryId ?? "—",
            categoryColor: txCategory?.color ?? "#888",
            categoryIcon: txCategory?.icon,
            date: tx.date,
            notes: tx.notes ?? "",
          };
        }),
      };
    }),
  };
}
