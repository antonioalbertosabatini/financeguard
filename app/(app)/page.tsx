"use client";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ErrorState } from "@/components/common/error-state";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { getDashboardData } from "@/lib/actions/transactions";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { useYear } from "@/providers/year-provider";

export default function DashboardPage() {
  const { year } = useYear();
  const { data, failed, error, reload } = useAsyncData(() => getDashboardData(year), [year]);

  if (!data && failed) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <PageSkeleton variant="dashboard" />;

  return (
    <DashboardView
      totalBalance={data.totalBalance}
      availableBalance={data.availableBalance}
      inAccumulation={data.inAccumulation}
      inStocks={data.inStocks}
      monthlyIncome={data.monthlyIncome}
      monthlyExpense={data.monthlyExpense}
      currency={data.settings.defaultCurrency}
      locale={data.settings.locale}
      expensesByCategory={data.expensesByCategory}
      monthlyTrend={data.monthlyTrend}
    />
  );
}
