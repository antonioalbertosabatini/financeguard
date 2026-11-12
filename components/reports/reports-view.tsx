"use client";

import type { ReactNode } from "react";
import { StatTile, type StatTone } from "@/components/common/stat-tile";
import { chartBar, chartColors, chartCursor, chartDonut } from "@/components/charts/chart-theme";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingDown, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CategoryBreakdown } from "@/components/reports/category-breakdown";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAmountVisibility } from "@/providers/amount-visibility-provider";
import { useFormatCents } from "@/hooks/use-format-cents";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { getMonthlyReport } from "@/lib/actions/transactions";
import {
  getMonthLabels,
  getMonthLabelsFull,
} from "@/lib/i18n/translate";
import { currentMonth } from "@/lib/utils/dates";
import type {
  DailyExpenseRow,
  DailyExpenseSeries,
} from "@/lib/utils/balance";
import { useI18n } from "@/providers/i18n-provider";

type CategoryAmount = {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
};

type MonthlyTrend = { month: number; income: number; expense: number };

type DailyExpenses = {
  rows: DailyExpenseRow[];
  series: DailyExpenseSeries[];
};

type ReportsViewProps = {
  year: number;
  currency: string;
  locale: string;
  initialMonthlyReport: {
    income: number;
    expense: number;
    net: number;
    expensesByCategory: CategoryAmount[];
    dailyExpenses: DailyExpenses;
  };
  annualReport: {
    income: number;
    expense: number;
    net: number;
    monthlyTrend: MonthlyTrend[];
    expensesByCategory: CategoryAmount[];
  };
};

/** Report KPI: thin wrapper over the shared StatTile. */
function StatCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  tone: StatTone;
}) {
  return <StatTile label={title} value={value} icon={icon} tone={tone} />;
}

function CategoryBarChart({
  data,
  currency,
  locale,
}: {
  data: CategoryAmount[];
  currency: string;
  locale: string;
}) {
  const formatAmount = useFormatCents();
  const { amountsHidden } = useAmountVisibility();
  const isMobile = useIsMobile();
  const [activeIndex, setActiveIndex] = useState<number | undefined>();

  const chartData = data.map((c) => ({
    name: c.name,
    amount: c.amount / 100,
    color: c.color,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 4, right: 8 }}
        onMouseLeave={() => setActiveIndex(undefined)}
      >
        <XAxis
          type="number"
          fontSize={isMobile ? 10 : 12}
          tickLine={false}
          axisLine={false}
          stroke="var(--muted-foreground)"
          tickFormatter={(value) =>
            amountsHidden
              ? "••"
              : formatAmount(Number(value) * 100, currency, locale)
          }
        />
        <YAxis
          type="category"
          dataKey="name"
          fontSize={isMobile ? 11 : 12}
          width={isMobile ? 76 : 110}
          tickLine={false}
          axisLine={false}
          tick={({ x, y, payload, index }) => {
            const entry = chartData[index];
            const isActive = activeIndex === index;
            const maxChars = isMobile ? 10 : 16;
            const label =
              payload.value.length > maxChars
                ? `${payload.value.slice(0, maxChars - 1)}…`
                : payload.value;
            return (
              <text
                x={x}
                y={y}
                dy={4}
                textAnchor="end"
                fill={isActive ? entry.color : "var(--muted-foreground)"}
                fontSize={isMobile ? 11 : 12}
              >
                {label}
              </text>
            );
          }}
        />
        <Tooltip
          trigger={isMobile ? "click" : "hover"}
          cursor={chartCursor}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const entry = payload[0].payload as {
              name: string;
              color: string;
              amount: number;
            };
            return (
              <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
                <p className="flex items-center gap-2 font-medium">
                  <span
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span style={{ color: entry.color }}>{entry.name}</span>
                  <span className="tabular-nums text-foreground">
                    {amountsHidden
                      ? "••"
                      : formatAmount(entry.amount * 100, currency, locale)}
                  </span>
                </p>
              </div>
            );
          }}
        />
        <Bar
          dataKey="amount"
          radius={[0, 4, 4, 0]}
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onClick={(_, index) => setActiveIndex(index)}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CategoryPieChart({
  data,
  currency,
  locale,
}: {
  data: CategoryAmount[];
  currency: string;
  locale: string;
}) {
  const isMobile = useIsMobile();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="name"
          cx="50%"
          cy={isMobile ? "45%" : "50%"}
          innerRadius={isMobile ? 56 : 70}
          outerRadius={isMobile ? 84 : 104}
          paddingAngle={chartDonut.paddingAngle}
          cornerRadius={chartDonut.cornerRadius}
          label={isMobile ? false : ({ name }) => name}
        >
          {data.map((entry) => (
            <Cell key={entry.categoryId} fill={entry.color} stroke="none" />
          ))}
        </Pie>
        <Tooltip
          trigger={isMobile ? "click" : "hover"}
          content={
            <ChartTooltip
              currency={currency}
              locale={locale}
              valueScale={1}
              hideLabel
            />
          }
        />
        {isMobile && (
          <Legend
            iconType="circle"
            verticalAlign="bottom"
            wrapperStyle={{ fontSize: 12, lineHeight: "1.6" }}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}

function DailyStackedBarChart({
  rows,
  series,
  currency,
  locale,
}: {
  rows: DailyExpenseRow[];
  series: DailyExpenseSeries[];
  currency: string;
  locale: string;
}) {
  const { t } = useI18n();
  const formatAmount = useFormatCents();
  const { amountsHidden } = useAmountVisibility();
  const isMobile = useIsMobile();

  const chart = (
    <BarChart data={rows} margin={{ left: 4, right: 8, top: 4 }}>
      <XAxis
        dataKey="label"
        fontSize={isMobile ? 10 : 12}
        tickLine={false}
        axisLine={false}
        tickMargin={6}
        stroke="var(--muted-foreground)"
        interval={isMobile ? 1 : "preserveStartEnd"}
      />
      <YAxis
        fontSize={isMobile ? 10 : 12}
        width={isMobile ? 40 : 52}
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
        trigger={isMobile ? "click" : "hover"}
        cursor={chartCursor}
        content={
          <ChartTooltip
            currency={currency}
            locale={locale}
            labelFormatter={(label) => t("reports.dayLabel", { day: label })}
          />
        }
      />
      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      {series.map((cat, index) => (
        <Bar
          key={cat.key}
          dataKey={cat.name}
          stackId="daily"
          fill={cat.color}
          radius={index === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
        />
      ))}
    </BarChart>
  );

  if (isMobile) {
    const minWidth = Math.max(rows.length * 26, 320);
    return (
      <div className="chart-scroll-x h-full w-full overflow-x-auto">
        <div style={{ minWidth, height: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            {chart}
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      {chart}
    </ResponsiveContainer>
  );
}

export function ReportsView({
  year,
  currency,
  locale,
  initialMonthlyReport,
  annualReport,
}: ReportsViewProps) {
  const { t, language } = useI18n();
  const formatAmount = useFormatCents();
  const { amountsHidden } = useAmountVisibility();
  const isMobile = useIsMobile();

  const monthLabels = useMemo(() => getMonthLabels(language), [language]);
  const monthLabelsFull = useMemo(
    () => getMonthLabelsFull(language),
    [language]
  );
  const incomeLabel = t("labels.chart.income");
  const expenseLabel = t("labels.chart.expense");

  const [month, setMonth] = useState(String(currentMonth()));
  const [monthlyReport, setMonthlyReport] = useState(initialMonthlyReport);
  const [loading, setLoading] = useState(false);

  const monthNum = parseInt(month, 10);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getMonthlyReport(year, monthNum);
        if (!cancelled) {
          setMonthlyReport({
            income: data.income,
            expense: data.expense,
            net: data.net,
            expensesByCategory: data.expensesByCategory,
            dailyExpenses: data.dailyExpenses,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [year, monthNum]);

  const trendData = annualReport.monthlyTrend.map((m) => ({
    name: monthLabels[m.month - 1],
    [incomeLabel]: m.income / 100,
    [expenseLabel]: m.expense / 100,
  }));

  const monthLabel = monthLabelsFull[monthNum - 1];
  const hasMonthlyExpenses = monthlyReport.expensesByCategory.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("reports.title")}
        description={t("reports.description", { year })}
      />

      <Tabs defaultValue="monthly">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="monthly" className="flex-1 sm:flex-none">
            {t("reports.tabMonthly")}
          </TabsTrigger>
          <TabsTrigger value="annual" className="flex-1 sm:flex-none">
            {t("reports.tabAnnual")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthLabelsFull.map((label, i) => (
                  <SelectItem key={label} value={String(i + 1)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loading && (
              <span className="text-sm text-muted-foreground">
                {t("common.loadingEllipsis")}
              </span>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title={t("reports.incomeMonth", { month: monthLabel })}
              value={formatAmount(monthlyReport.income, currency, locale)}
              icon={TrendingUp}
              tone="success"
            />
            <StatCard
              title={t("reports.expenseMonth", { month: monthLabel })}
              value={formatAmount(monthlyReport.expense, currency, locale)}
              icon={TrendingDown}
              tone="danger"
            />
            <StatCard
              title={t("reports.netBalance")}
              value={formatAmount(monthlyReport.net, currency, locale)}
              icon={Wallet}
              tone="primary"
            />
          </div>

          {hasMonthlyExpenses && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>
                    {t("reports.distributionMonth", { month: monthLabel })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[340px] sm:h-[300px]">
                  <CategoryPieChart
                    data={monthlyReport.expensesByCategory}
                    currency={currency}
                    locale={locale}
                  />
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>
                    {t("reports.byCategoryMonth", { month: monthLabel })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <CategoryBarChart
                    data={monthlyReport.expensesByCategory}
                    currency={currency}
                    locale={locale}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>
                {t("reports.detailByCategoryMonth", { month: monthLabel })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryBreakdown
                categories={monthlyReport.expensesByCategory}
                currency={currency}
                locale={locale}
              />
            </CardContent>
          </Card>

          {hasMonthlyExpenses ? (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>
                  {t("reports.dailyMonth", { month: monthLabel })}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                <DailyStackedBarChart
                  rows={monthlyReport.dailyExpenses.rows}
                  series={monthlyReport.dailyExpenses.series}
                  currency={currency}
                  locale={locale}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>
                  {t("reports.dailyMonth", { month: monthLabel })}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {t("reports.noExpensesMonth")}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="annual" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title={t("reports.incomeYear", { year })}
              value={formatAmount(annualReport.income, currency, locale)}
              icon={TrendingUp}
              tone="success"
            />
            <StatCard
              title={t("reports.expenseYear", { year })}
              value={formatAmount(annualReport.expense, currency, locale)}
              icon={TrendingDown}
              tone="danger"
            />
            <StatCard
              title={t("reports.netAnnual")}
              value={formatAmount(annualReport.net, currency, locale)}
              icon={Wallet}
              tone="primary"
            />
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>{t("reports.monthlyTrend")}</CardTitle>
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
                    fontSize={isMobile ? 10 : 12}
                    tickLine={false}
                    axisLine={false}
                    interval={isMobile ? 1 : 0}
                    tickMargin={6}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis
                    fontSize={isMobile ? 10 : 12}
                    width={isMobile ? 38 : 52}
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
                    trigger={isMobile ? "click" : "hover"}
                    cursor={chartCursor}
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
                    fill={chartColors.income}
                    radius={chartBar.radius}
                    maxBarSize={isMobile ? 14 : 28}
                  />
                  <Bar
                    dataKey={expenseLabel}
                    fill={chartColors.expense}
                    radius={chartBar.radius}
                    maxBarSize={isMobile ? 14 : 28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>{t("reports.byCategoryYear", { year })}</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryBreakdown
                categories={annualReport.expensesByCategory}
                currency={currency}
                locale={locale}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
