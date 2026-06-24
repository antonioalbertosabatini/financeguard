"use client";

import { BudgetView } from "@/components/budget/budget-view";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { getCategories } from "@/lib/actions/categories";
import { getBudgetProgress } from "@/lib/actions/transactions";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { useYear } from "@/providers/year-provider";
import { currentMonth } from "@/lib/utils/dates";

export default function BudgetPage() {
  const { year } = useYear();
  const month = currentMonth();
  const { data } = useAsyncData(
    async () => ({
      progress: await getBudgetProgress(year, month),
      categories: await getCategories(),
    }),
    [year, month]
  );

  if (!data) return <FullScreenLoader />;

  return (
    <BudgetView
      items={data.progress.items}
      categories={data.categories}
      availableTags={data.progress.availableTags}
      year={year}
      month={month}
      currency={data.progress.settings.defaultCurrency}
      locale={data.progress.settings.locale}
    />
  );
}
