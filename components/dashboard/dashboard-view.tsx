"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { useAmountVisibility } from "@/providers/amount-visibility-provider";
import { useFormatCents } from "@/hooks/use-format-cents";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { getMonthLabels } from "@/lib/i18n/translate";
import { useI18n } from "@/providers/i18n-provider";

type DashboardProps = {
  totalBalance: number;
  availableBalance: number;
  inAccumulation: number;
  inStocks: number;
  monthlyIncome: number;
  monthlyExpense: number;
  currency: string;
  locale: string;
  expensesByCategory: {
    name: string;
    color: string;
    amount: number;
  }[];
  monthlyTrend: { month: number; income: number; expense: number }[];
};

function FlowTile({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  tone: "success" | "danger";
}) {
  const toneClasses =
    tone === "success"
      ? "bg-success/10 text-success"
      : "bg-danger/10 text-danger";
  const valueTone = tone === "success" ? "text-success" : "text-danger";
  return (
    <Card className="shadow-soft">
      <CardContent className="flex flex-col gap-2 py-1">
        <div className="flex items-center gap-2">
          <span
            className={`flex size-8 items-center justify-center rounded-lg ${toneClasses}`}
          >
            <Icon className="size-4" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {title}
          </span>
        </div>
        <p className={`text-xl font-semibold tabular-nums sm:text-2xl ${valueTone}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export function DashboardView({
  totalBalance,
  availableBalance,
  inAccumulation,
  inStocks,
  monthlyIncome,
  monthlyExpense,
  currency,
  locale,
  expensesByCategory,
  monthlyTrend,
}: DashboardProps) {
  const { t, language } = useI18n();
  const formatAmount = useFormatCents();
  const { amountsHidden } = useAmountVisibility();
  const isMobile = useIsMobile();
  const tooltipTrigger = isMobile ? "click" : "hover";

  const monthLabels = useMemo(() => getMonthLabels(language), [language]);
  const incomeLabel = t("labels.chart.income");
  const expenseLabel = t("labels.chart.expense");

  const trendData = useMemo(
    () =>
      monthlyTrend.map((m) => ({
        name: monthLabels[m.month - 1],
        [incomeLabel]: m.income / 100,
        [expenseLabel]: m.expense / 100,
      })),
    [monthlyTrend, monthLabels, incomeLabel, expenseLabel]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      {/* Hero: total balance */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/75 p-6 text-primary-foreground shadow-card">
        <div
          aria-hidden
          className="absolute -top-16 -right-12 size-48 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative">
          <p className="text-sm font-medium text-primary-foreground/80">
            {t("dashboard.totalBalance")}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
            {formatAmount(totalBalance, currency)}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-primary-foreground/70">
                {t("dashboard.availableBalance")}
              </p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {formatAmount(availableBalance, currency)}
              </p>
            </div>
            <div>
              <p className="text-primary-foreground/70">
                {t("dashboard.inAccumulation")}
              </p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {formatAmount(inAccumulation, currency)}
              </p>
            </div>
            <div>
              <p className="text-primary-foreground/70">
                {t("dashboard.inStocks")}
              </p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {formatAmount(inStocks, currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <FlowTile
          title={t("dashboard.monthlyIncome")}
          value={formatAmount(monthlyIncome, currency, locale)}
          icon={TrendingUp}
          tone="success"
        />
        <FlowTile
          title={t("dashboard.monthlyExpense")}
          value={formatAmount(monthlyExpense, currency, locale)}
          icon={TrendingDown}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>{t("dashboard.expensesByCategory")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] sm:h-[300px]">
            {expensesByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("dashboard.noExpenses")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={isMobile ? 46 : 56}
                    outerRadius={isMobile ? 76 : 96}
                    paddingAngle={2}
                  >
                    {expensesByCategory.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    trigger={tooltipTrigger}
                    content={
                      <ChartTooltip
                        currency={currency}
                        locale={locale}
                        valueScale={1}
                        hideLabel
                      />
                    }
                  />
                  <Legend
                    iconType="circle"
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: 12, lineHeight: "1.6" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>{t("dashboard.monthlyTrend")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trendData}
                barGap={2}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  fontSize={isMobile ? 10 : 11}
                  tickLine={false}
                  axisLine={false}
                  interval={isMobile ? 1 : 0}
                  tickMargin={6}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  fontSize={isMobile ? 10 : 11}
                  width={isMobile ? 38 : 44}
                  tickLine={false}
                  axisLine={false}
                  stroke="var(--muted-foreground)"
                  tickFormatter={(value) =>
                    amountsHidden
                      ? "••"
                      : formatAmount(Number(value) * 100, currency, locale)
                  }
                />
                <Tooltip
                  trigger={tooltipTrigger}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  content={
                    <ChartTooltip currency={currency} locale={locale} />
                  }
                />
                <Legend
                  iconType="circle"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar
                  dataKey={incomeLabel}
                  fill="var(--success)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={isMobile ? 14 : 28}
                />
                <Bar
                  dataKey={expenseLabel}
                  fill="var(--danger)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={isMobile ? 14 : 28}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
