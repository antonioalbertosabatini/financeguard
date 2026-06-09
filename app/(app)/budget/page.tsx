import { BudgetView } from "@/components/budget/budget-view";
import { getCategories } from "@/lib/actions/categories";
import { getBudgetProgress } from "@/lib/actions/transactions";
import { currentMonth, currentYear } from "@/lib/utils/dates";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = params.year ? parseInt(params.year, 10) : currentYear();
  const month = currentMonth();
  const [data, categories] = await Promise.all([
    getBudgetProgress(year, month),
    getCategories(),
  ]);

  return (
    <BudgetView
      items={data.items}
      categories={categories}
      currency={data.settings.defaultCurrency}
      locale={data.settings.locale}
    />
  );
}
