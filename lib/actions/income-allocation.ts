import { getAccumulationPlans } from "@/lib/db/accumulation-plans";
import { getCategories } from "@/lib/db/categories";
import { getSettings, updateSettings } from "@/lib/db/settings";
import { getTransactionsForYear } from "@/lib/db/transactions";
import { ACCUMULATION_CATEGORY_COLOR, ACCUMULATION_CATEGORY_ID } from "@/lib/constants";
import { getCurrentLanguage } from "@/lib/i18n/runtime";
import { translate } from "@/lib/i18n/translate";
import type { IncomeAllocationBucketId } from "@/lib/schemas/settings";
import { INCOME_ALLOCATION_BUCKET_IDS } from "@/lib/schemas/settings";
import {
  allocateCents,
  bucketProgress,
  filterIncomeTransactions,
  periodKey,
  persistPeriodAssignments,
  sanitizePeriodAssignments,
  spentByBucket,
  sumIncomeCents,
} from "@/lib/utils/income-allocation";
import { filterByMonth } from "@/lib/utils/balance";
import {
  postedContributionsForYear,
  type AccumulationContribution,
} from "@/lib/utils/accumulation";
import { expandRecurrences } from "@/lib/utils/recurrence";

export type AllocationExpenseItem = {
  occurrenceId: string;
  date: string;
  amount: number;
  notes: string;
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  isAccumulation: boolean;
  planName?: string;
};

function accumulationCategoryName() {
  return translate(getCurrentLanguage(), "plans.categoryName");
}

function contributionsInMonth(
  contributions: AccumulationContribution[],
  year: number,
  month: number
) {
  const prefix = periodKey(year, month);
  return contributions.filter((item) => item.date.startsWith(prefix));
}

export async function getIncomeAllocation(year: number, month: number) {
  const [settings, categories, raw, plans] = await Promise.all([
    getSettings(),
    getCategories(),
    getTransactionsForYear(year),
    getAccumulationPlans(),
  ]);

  const monthTxs = filterByMonth(expandRecurrences(raw, year), year, month);
  const incomeTxs = filterIncomeTransactions(
    monthTxs,
    settings.incomeAllocation.incomeCategoryIds
  );
  const totalIncome = sumIncomeCents(incomeTxs);
  const targets = allocateCents(totalIncome, settings.incomeAllocation.percents);

  const categoryMap = Object.fromEntries(
    categories.map((category) => [category.id, category])
  );
  const expenses: AllocationExpenseItem[] = monthTxs
    .filter((tx) => tx.type === "expense")
    .map((tx) => {
      const category = tx.categoryId ? categoryMap[tx.categoryId] : undefined;
      return {
        occurrenceId: tx.occurrenceId,
        date: tx.date,
        amount: tx.amount,
        notes: tx.notes ?? "",
        categoryId: tx.categoryId,
        categoryName: category?.name ?? tx.categoryId ?? "",
        categoryIcon: category?.icon ?? "circle",
        categoryColor: category?.color ?? "#888888",
        isAccumulation: false,
      };
    });

  const planNames = Object.fromEntries(plans.map((plan) => [plan.id, plan.name]));
  const posted = contributionsInMonth(
    postedContributionsForYear(plans, year),
    year,
    month
  );
  const accumulation: AllocationExpenseItem[] = posted.map((item) => ({
    occurrenceId: item.occurrenceId,
    date: item.date,
    amount: item.amount,
    notes: planNames[item.planId] ?? item.planId,
    categoryId: ACCUMULATION_CATEGORY_ID,
    categoryName: accumulationCategoryName(),
    categoryIcon: "piggy-bank",
    categoryColor: ACCUMULATION_CATEGORY_COLOR,
    isAccumulation: true,
    planName: planNames[item.planId],
  }));

  const validExpenseIds = new Set(expenses.map((item) => item.occurrenceId));
  const accumulationIds = posted.map((item) => item.occurrenceId);
  const assignments = sanitizePeriodAssignments(
    settings.incomeAllocationAssignments[periodKey(year, month)],
    validExpenseIds,
    new Set(accumulationIds)
  );

  const amountByOccurrence = new Map<string, number>();
  for (const item of expenses) {
    amountByOccurrence.set(item.occurrenceId, item.amount);
  }
  for (const item of accumulation) {
    amountByOccurrence.set(item.occurrenceId, item.amount);
  }

  const spent = spentByBucket(amountByOccurrence, assignments, accumulationIds);
  const progress = bucketProgress(targets, spent);

  return {
    year,
    month,
    settings,
    incomeCategories: categories.filter((category) => category.type === "income"),
    totalIncome,
    percents: settings.incomeAllocation.percents,
    incomeCategoryIds: settings.incomeAllocation.incomeCategoryIds,
    amounts: targets,
    expenses,
    accumulation,
    assignments,
    progress,
  };
}

export async function saveIncomeAllocationAssignments(
  year: number,
  month: number,
  bucketId: IncomeAllocationBucketId,
  selectedIds: string[]
) {
  if (!INCOME_ALLOCATION_BUCKET_IDS.includes(bucketId)) {
    return getSettings();
  }

  const [settings, raw, plans] = await Promise.all([
    getSettings(),
    getTransactionsForYear(year),
    getAccumulationPlans(),
  ]);

  const monthTxs = filterByMonth(expandRecurrences(raw, year), year, month);
  const validExpenseIds = new Set(
    monthTxs
      .filter((tx) => tx.type === "expense")
      .map((tx) => tx.occurrenceId)
  );
  const accumulationIds = new Set(
    contributionsInMonth(
      postedContributionsForYear(plans, year),
      year,
      month
    ).map((item) => item.occurrenceId)
  );

  const nextAssignments = persistPeriodAssignments(
    settings.incomeAllocationAssignments,
    year,
    month,
    bucketId,
    selectedIds,
    validExpenseIds,
    accumulationIds
  );

  return updateSettings({
    ...settings,
    incomeAllocationAssignments: nextAssignments,
  });
}
