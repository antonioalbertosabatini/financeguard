import { getAccounts } from "@/lib/db/accounts";
import { getAccumulationPlans } from "@/lib/db/accumulation-plans";
import { getAccountTransfersForYear } from "@/lib/db/account-transfers";
import { getBudgets } from "@/lib/db/budgets";
import { getCategories } from "@/lib/db/categories";
import { getSettings } from "@/lib/db/settings";
import { getStockHoldings } from "@/lib/db/stock-holdings";
import {
  copyRecurringRules,
  createTransaction as dbCreateTransaction,
  deleteTransaction as dbDeleteTransaction,
  getTransactionsForYear,
  listTransactionYears,
  updateTransaction as dbUpdateTransaction,
} from "@/lib/db/transactions";
import type { Category } from "@/lib/schemas/category";
import { getCurrentLanguage } from "@/lib/i18n/runtime";
import { mapLocale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/translate";
import {
  createTransactionSchemas,
  type ExpandedTransaction,
  type TransactionFilters,
  type TransactionInput,
} from "@/lib/schemas/transaction";
import {
  calculateAccountBalance,
  calculateTotalBalance,
  filterByMonth,
  sumByType,
  sumExpensesByCategory,
  sumExpensesByDayAndCategory,
  sumByMonth,
} from "@/lib/utils/balance";
import { currentYear } from "@/lib/utils/dates";
import {
  accumulationCategory,
  contributionYears,
  contributionsForYear,
  postedContributionsForYear,
  sumAccumulation,
  toSyntheticExpenses,
  type AccumulationContribution,
} from "@/lib/utils/accumulation";
import {
  postedPurchasesForYear,
  purchaseYears,
  purchasesForYear,
  stockCategory,
  toStockSyntheticExpenses,
} from "@/lib/utils/stocks";
import {
  expandRecurrences,
  filterExpandedTransactions,
  filterOccurrencesForListView,
  filterRawTransactions,
} from "@/lib/utils/recurrence";
import { normalizeTag } from "@/lib/utils/tags";

function mapCategoryExpenses(
  categories: Category[],
  amounts: Record<string, number>,
  sort = false
) {
  const withSystem = [
    ...categories,
    accumulationCategory(accumulationCategoryName()),
    stockCategory(stockCategoryName()),
  ];
  const categoryMap = Object.fromEntries(withSystem.map((c) => [c.id, c]));
  const items = Object.entries(amounts).map(([categoryId, amount]) => ({
    categoryId,
    name: categoryMap[categoryId]?.name ?? categoryId,
    color: categoryMap[categoryId]?.color ?? "#888",
    amount,
  }));
  return sort ? items.sort((a, b) => b.amount - a.amount) : items;
}

function accumulationCategoryName() {
  return translate(getCurrentLanguage(), "plans.categoryName");
}

function stockCategoryName() {
  return translate(getCurrentLanguage(), "plans.stocksCategoryName");
}

function withInvestmentExpenses(
  expanded: ExpandedTransaction[],
  contributions: AccumulationContribution[],
  purchases: AccumulationContribution[]
) {
  return [
    ...expanded,
    ...toSyntheticExpenses(contributions),
    ...toStockSyntheticExpenses(purchases),
  ];
}

async function postedInvestments(year: number, asOfISO?: string) {
  const [plans, holdings] = await Promise.all([
    getAccumulationPlans(),
    getStockHoldings(),
  ]);
  return {
    contributions: postedContributionsForYear(plans, year, asOfISO),
    purchases: postedPurchasesForYear(holdings, year, asOfISO),
  };
}

async function yearInvestments(year: number) {
  const [plans, holdings] = await Promise.all([
    getAccumulationPlans(),
    getStockHoldings(),
  ]);
  return {
    contributions: contributionsForYear(plans, year),
    purchases: purchasesForYear(holdings, year),
  };
}

async function expandedForYear(year: number, asOfISO?: string) {
  const raw = await getTransactionsForYear(year);
  let expanded = expandRecurrences(raw, year);
  if (asOfISO) expanded = expanded.filter((tx) => tx.date <= asOfISO);
  return expanded;
}

export async function getAvailableYears() {
  const [years, plans, holdings] = await Promise.all([
    listTransactionYears(),
    getAccumulationPlans(),
    getStockHoldings(),
  ]);
  const extraYears = [
    ...contributionYears(plans),
    ...purchaseYears(holdings),
  ];
  for (const year of extraYears) {
    if (!years.includes(year)) years.push(year);
  }
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

export async function getTransactionsForListView(year: number) {
  const raw = await getTransactionsForYear(year);
  const transactions = [...raw].sort((a, b) => b.date.localeCompare(a.date));
  const expanded = expandRecurrences(raw, year);
  const occurrences = filterOccurrencesForListView(
    expanded.filter((tx) => tx.isOccurrence),
    year
  );
  return { transactions, occurrences };
}

export async function loadTransactionFormDeps(year: number) {
  const [accounts, categories, availableTags] = await Promise.all([
    getAccounts(),
    getCategories(),
    getAvailableTags(year, ["income", "expense"]),
  ]);
  return { accounts, categories, availableTags };
}

export async function createTransaction(data: TransactionInput) {
  const { transactionInputSchema } = createTransactionSchemas((key, params) =>
    translate(getCurrentLanguage(), key, params)
  );
  const parsed = transactionInputSchema.parse(data);
  return dbCreateTransaction(parsed);
}

export async function updateTransaction(
  id: string,
  year: number,
  data: TransactionInput
) {
  const { transactionInputSchema } = createTransactionSchemas((key, params) =>
    translate(getCurrentLanguage(), key, params)
  );
  const parsed = transactionInputSchema.parse(data);
  return dbUpdateTransaction(id, year, parsed);
}

export async function deleteTransaction(id: string, year: number) {
  await dbDeleteTransaction(id, year);
}

export async function copyRecurringFromPreviousYear(toYear: number) {
  return copyRecurringRules(toYear - 1, toYear);
}

export async function getDashboardData(year: number) {
  const [accounts, categories, settings, transfers, expanded, posted] =
    await Promise.all([
      getAccounts(),
      getCategories(),
      getSettings(),
      getAccountTransfersForYear(year),
      expandedForYear(year),
      postedInvestments(year),
    ]);

  const now = new Date();
  const monthPrefix = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const reportTxs = withInvestmentExpenses(
    expanded,
    posted.contributions,
    posted.purchases
  );
  const monthTxs = reportTxs.filter((tx) => tx.date.startsWith(monthPrefix));
  const accountDebits = [...posted.contributions, ...posted.purchases];
  const liquidBalance = calculateTotalBalance(
    accounts,
    expanded,
    transfers,
    accountDebits
  );
  const inAccumulation = sumAccumulation(posted.contributions);
  const inStocks = sumAccumulation(posted.purchases);

  return {
    settings,
    totalBalance: liquidBalance + inAccumulation + inStocks,
    availableBalance: liquidBalance,
    inAccumulation,
    inStocks,
    monthlyIncome: sumByType(monthTxs, "income"),
    monthlyExpense: sumByType(monthTxs, "expense"),
    expensesByCategory: mapCategoryExpenses(
      categories,
      sumExpensesByCategory(reportTxs)
    ),
    monthlyTrend: sumByMonth(reportTxs, year),
  };
}

export async function getAvailableTags(
  year?: number,
  types: Array<"income" | "expense"> = ["expense"]
) {
  const years =
    year !== undefined
      ? [year]
      : await listTransactionYears().then((ys) =>
          ys.length > 0 ? ys : [currentYear()]
        );

  const allowed = new Set(types);
  const tags = new Set<string>();
  for (const y of years) {
    for (const tx of await getTransactionsForYear(y)) {
      if (!allowed.has(tx.type as "income" | "expense")) continue;
      for (const tag of tx.tags) {
        const normalized = normalizeTag(tag);
        if (normalized) tags.add(normalized);
      }
    }
  }

  return Array.from(tags).sort((a, b) =>
    a.localeCompare(b, mapLocale(getCurrentLanguage()), { sensitivity: "base" })
  );
}

export async function getMonthlyReport(year: number, month: number) {
  const [categories, settings, expanded, posted] = await Promise.all([
    getCategories(),
    getSettings(),
    expandedForYear(year),
    postedInvestments(year),
  ]);

  const monthTxs = filterByMonth(
    withInvestmentExpenses(expanded, posted.contributions, posted.purchases),
    year,
    month
  );
  const reportCategories = [
    ...categories,
    accumulationCategory(accumulationCategoryName()),
    stockCategory(stockCategoryName()),
  ];

  return {
    settings,
    income: sumByType(monthTxs, "income"),
    expense: sumByType(monthTxs, "expense"),
    net: sumByType(monthTxs, "income") - sumByType(monthTxs, "expense"),
    expensesByCategory: mapCategoryExpenses(
      categories,
      sumExpensesByCategory(monthTxs),
      true
    ),
    dailyExpenses: sumExpensesByDayAndCategory(
      monthTxs,
      year,
      month,
      reportCategories.map((c) => ({ id: c.id, name: c.name, color: c.color }))
    ),
  };
}

export async function getAnnualReport(year: number) {
  const [categories, settings, expanded, posted] = await Promise.all([
    getCategories(),
    getSettings(),
    expandedForYear(year),
    postedInvestments(year),
  ]);

  const reportTxs = withInvestmentExpenses(
    expanded,
    posted.contributions,
    posted.purchases
  );

  return {
    settings,
    income: sumByType(reportTxs, "income"),
    expense: sumByType(reportTxs, "expense"),
    net: sumByType(reportTxs, "income") - sumByType(reportTxs, "expense"),
    monthlyTrend: sumByMonth(reportTxs, year),
    expensesByCategory: mapCategoryExpenses(
      categories,
      sumExpensesByCategory(reportTxs),
      true
    ),
  };
}

export async function getAccountsWithBalances(year: number) {
  const [accounts, expanded, transfers, posted] = await Promise.all([
    getAccounts(),
    expandedForYear(year),
    getAccountTransfersForYear(year),
    yearInvestments(year),
  ]);
  const accountDebits = [...posted.contributions, ...posted.purchases];

  return accounts.map((account) => ({
    ...account,
    balance: calculateAccountBalance(account, expanded, transfers, accountDebits),
  }));
}

export async function getAccountsWithBalancesAsOf(year: number, asOfISO: string) {
  const [accounts, expanded, transfers, posted] = await Promise.all([
    getAccounts(),
    expandedForYear(year, asOfISO),
    getAccountTransfersForYear(year).then((items) =>
      items.filter((tr) => tr.date <= asOfISO)
    ),
    postedInvestments(year, asOfISO),
  ]);
  const accountDebits = [...posted.contributions, ...posted.purchases];

  return accounts.map((account) => ({
    ...account,
    balance: calculateAccountBalance(account, expanded, transfers, accountDebits),
  }));
}

export async function getAccountsAnalysisSummary(year: number, asOfISO: string) {
  const [accounts, expandedAll, transfersAll, yearPosted] = await Promise.all([
    getAccounts(),
    expandedForYear(year),
    getAccountTransfersForYear(year),
    yearInvestments(year),
  ]);

  const expandedAsOf = expandedAll.filter((tx) => tx.date <= asOfISO);
  const transfersAsOf = transfersAll.filter((tr) => tr.date <= asOfISO);
  const yearDebits = [...yearPosted.contributions, ...yearPosted.purchases];
  const postedAsOfDate = yearDebits.filter((item) => item.date <= asOfISO);

  const accountsAsOf = accounts.map((account) => ({
    ...account,
    balance: calculateAccountBalance(
      account,
      expandedAsOf,
      transfersAsOf,
      postedAsOfDate
    ),
  }));

  const accountsAll = accounts.map((account) => ({
    ...account,
    balance: calculateAccountBalance(
      account,
      expandedAll,
      transfersAll,
      yearDebits
    ),
  }));

  return {
    accountsAsOf,
    accountsAll,
    totalAsOf: calculateTotalBalance(
      accounts,
      expandedAsOf,
      transfersAsOf,
      postedAsOfDate
    ),
    totalAll: calculateTotalBalance(
      accounts,
      expandedAll,
      transfersAll,
      yearDebits
    ),
    asOfISO,
  };
}

export async function getBudgetProgress(year: number, month: number) {
  const [budgets, categories, settings, expanded] = await Promise.all([
    getBudgets(),
    getCategories(),
    getSettings(),
    expandedForYear(year),
  ]);

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
