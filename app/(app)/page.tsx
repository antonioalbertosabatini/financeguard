import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDashboardData } from "@/lib/actions/transactions";
import { isUnlocked } from "@/lib/crypto/session";
import { currentYear } from "@/lib/utils/dates";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  if (!isUnlocked()) {
    redirect("/unlock");
  }

  const params = await searchParams;
  const year = params.year ? parseInt(params.year, 10) : currentYear();
  const data = await getDashboardData(year);

  return (
    <DashboardView
      totalBalance={data.totalBalance}
      monthlyIncome={data.monthlyIncome}
      monthlyExpense={data.monthlyExpense}
      currency={data.settings.defaultCurrency}
      locale={data.settings.locale}
      expensesByCategory={data.expensesByCategory}
      monthlyTrend={data.monthlyTrend}
    />
  );
}
