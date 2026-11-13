"use client";

import { useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Amount } from "@/components/common/amount";
import { Rise } from "@/components/common/motion";
import { StatTile } from "@/components/common/stat-tile";
import { BalanceHero } from "@/components/dashboard/balance-hero";
import { BudgetsAtRisk, type BudgetAtRisk } from "@/components/dashboard/budgets-at-risk";
import { ExpensesDonut } from "@/components/dashboard/expenses-donut";
import { MonthlyTrendChart } from "@/components/dashboard/monthly-trend-chart";
import { RecentTransactions, type RecentTransaction } from "@/components/dashboard/recent-transactions";
import { getMonthLabelsFull } from "@/lib/i18n/translate";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

export interface DashboardData {
  totalBalance: number;
  availableBalance: number;
  inAccumulation: number;
  inStocks: number;
  monthlyIncome: number;
  monthlyExpense: number;
  currentMonth: number;
  accountsCount: number;
  recentTransactions: RecentTransaction[];
  budgetsAtRisk: BudgetAtRisk[];
  budgetsCount: number;
  expensesByCategory: { name: string; color: string; amount: number }[];
  monthlyTrend: { month: number; income: number; expense: number }[];
}

/** Percentage change vs. the previous month, or null when not meaningful. */
function delta(current: number, previous: number | undefined): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function DeltaHint({
  value,
  month,
  goodWhenUp,
}: {
  value: number | null;
  month: string;
  goodWhenUp: boolean;
}) {
  const { t } = useI18n();
  if (value === null) return null;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const good = value === 0 ? null : value > 0 === goodWhenUp;
  return (
    <span className={cn(good === true && "text-success", good === false && "text-danger")}>
      {t("dashboard.vsMonth", { delta: `${sign}${Math.abs(value)}%`, month })}
    </span>
  );
}

export function DashboardView({
  data,
  year,
  currency,
  locale,
}: {
  data: DashboardData;
  year: number;
  currency: string;
  locale: string;
}) {
  const { t, language } = useI18n();
  const monthNames = useMemo(() => getMonthLabelsFull(language), [language]);
  const previous = data.monthlyTrend.find((m) => m.month === data.currentMonth - 1);
  const previousName = monthNames[data.currentMonth - 2]?.toLowerCase() ?? "";
  const monthlyNet = useMemo(
    () => data.monthlyTrend.map((m) => m.income - m.expense),
    [data.monthlyTrend]
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboard.title")} description={t("dashboard.description")} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Rise className="min-w-0 lg:col-span-2">
          <BalanceHero
            className="h-full"
            totalBalance={data.totalBalance}
            availableBalance={data.availableBalance}
            inAccumulation={data.inAccumulation}
            inStocks={data.inStocks}
            accountsCount={data.accountsCount}
            monthNet={data.monthlyIncome - data.monthlyExpense}
            monthlyNet={monthlyNet}
            currentMonth={data.currentMonth}
            currency={currency}
          />
        </Rise>
        <Rise delay={0.06} className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-1">
          <StatTile
            label={t("dashboard.monthlyIncome")}
            icon={ArrowDownLeft}
            tone="success"
            value={<Amount cents={data.monthlyIncome} currency={currency} animated />}
            hint={
              <DeltaHint
                value={delta(data.monthlyIncome, previous?.income)}
                month={previousName}
                goodWhenUp
              />
            }
          />
          <StatTile
            label={t("dashboard.monthlyExpense")}
            icon={ArrowUpRight}
            tone="danger"
            value={<Amount cents={data.monthlyExpense} currency={currency} animated />}
            hint={
              <DeltaHint
                value={delta(data.monthlyExpense, previous?.expense)}
                month={previousName}
                goodWhenUp={false}
              />
            }
          />
        </Rise>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-6 lg:grid-cols-3">
        <Rise delay={0.12} className="min-w-0 lg:col-span-2">
          <MonthlyTrendChart data={data.monthlyTrend} year={year} currency={currency} locale={locale} />
        </Rise>
        <Rise delay={0.16} className="min-w-0">
          <BudgetsAtRisk items={data.budgetsAtRisk} budgetsCount={data.budgetsCount} currency={currency} />
        </Rise>
        <Rise delay={0.2} className="min-w-0 lg:col-span-2">
          <RecentTransactions items={data.recentTransactions} currency={currency} />
        </Rise>
        <Rise delay={0.24} className="min-w-0">
          <ExpensesDonut items={data.expensesByCategory} currency={currency} locale={locale} />
        </Rise>
      </div>
    </div>
  );
}
