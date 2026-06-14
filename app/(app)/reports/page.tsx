import { ReportsView } from "@/components/reports/reports-view";
import {
  getAnnualReport,
  getMonthlyReport,
} from "@/lib/actions/transactions";
import { currentMonth, currentYear } from "@/lib/utils/dates";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = params.year ? parseInt(params.year, 10) : currentYear();
  const month = currentMonth();

  const [monthlyReport, annualReport] = await Promise.all([
    getMonthlyReport(year, month),
    getAnnualReport(year),
  ]);

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
