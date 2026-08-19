import { getCategories } from "@/lib/db/categories";
import { getSettings } from "@/lib/db/settings";
import { getTransactionsForYear } from "@/lib/db/transactions";
import {
  allocateCents,
  filterIncomeTransactions,
  sumIncomeCents,
} from "@/lib/utils/income-allocation";
import { filterByMonth } from "@/lib/utils/balance";
import { expandRecurrences } from "@/lib/utils/recurrence";

export async function getIncomeAllocation(year: number, month: number) {
  const [settings, categories, raw] = await Promise.all([
    getSettings(),
    getCategories(),
    getTransactionsForYear(year),
  ]);

  const monthTxs = filterByMonth(expandRecurrences(raw, year), year, month);
  const incomeTxs = filterIncomeTransactions(
    monthTxs,
    settings.incomeAllocation.incomeCategoryIds
  );
  const totalIncome = sumIncomeCents(incomeTxs);

  return {
    year,
    month,
    settings,
    incomeCategories: categories.filter((category) => category.type === "income"),
    totalIncome,
    percents: settings.incomeAllocation.percents,
    incomeCategoryIds: settings.incomeAllocation.incomeCategoryIds,
    amounts: allocateCents(totalIncome, settings.incomeAllocation.percents),
  };
}
