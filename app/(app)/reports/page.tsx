"use client";

import { ReportsView } from "@/components/reports/reports-view";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { getAnnualReport, getMonthlyReport } from "@/lib/actions/transactions";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { useYear } from "@/providers/year-provider";
import { currentMonth } from "@/lib/utils/dates";

export default function ReportsPage() {
  const { year } = useYear();
  const month = currentMonth();
  const { data } = useAsyncData(
    async () => {
      const [monthlyReport, annualReport] = await Promise.all([
        getMonthlyReport(year, month),
        getAnnualReport(year),
      ]);
      return { monthlyReport, annualReport };
    },
    [year, month]
  );

  if (!data) return <FullScreenLoader />;

  const { monthlyReport, annualReport } = data;

  return (
    <ReportsView
      year={year}
      currency={monthlyReport.settings.defaultCurrency}
      locale={monthlyReport.settings.locale}
      initialMonthlyReport={{
        income: monthlyReport.income,
        expense: monthlyReport.expense,
        net: monthlyReport.net,
        expensesByCategory: monthlyReport.expensesByCategory,
        dailyExpenses: monthlyReport.dailyExpenses,
      }}
      annualReport={{
        income: annualReport.income,
        expense: annualReport.expense,
        net: annualReport.net,
        monthlyTrend: annualReport.monthlyTrend,
        expensesByCategory: annualReport.expensesByCategory,
      }}
    />
  );
}
