"use client";

import { useEffect, useState } from "react";
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
import { MONTH_LABELS, MONTH_LABELS_FULL } from "@/lib/constants";
import { currentMonth } from "@/lib/utils/dates";
import type {
  DailyExpenseRow,
  DailyExpenseSeries,
} from "@/lib/utils/balance";

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

function StatCard({
  title,
  value,
  icon: Icon,
  iconClassName,
  valueClassName,
  borderClassName,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  iconClassName: string;
  valueClassName?: string;
  borderClassName?: string;
}) {
  return (
    <Card className={`shadow-sm ${borderClassName ?? ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={`flex size-9 items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p
          className={`text-2xl font-bold tracking-tight tabular-nums sm:text-3xl ${valueClassName ?? ""}`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
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
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
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
          outerRadius={isMobile ? 78 : 100}
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
        cursor={{ fill: "var(--muted)", opacity: 0.4 }}
        content={
          <ChartTooltip
            currency={currency}
            locale={locale}
            labelFormatter={(label) => `Giorno ${label}`}
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
  const formatAmount = useFormatCents();
  const { amountsHidden } = useAmountVisibility();
  const isMobile = useIsMobile();

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
    name: MONTH_LABELS[m.month - 1],
    Entrate: m.income / 100,
    Uscite: m.expense / 100,
  }));

  const monthLabel = MONTH_LABELS_FULL[monthNum - 1];
  const hasMonthlyExpenses = monthlyReport.expensesByCategory.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Report" description={`Anno ${year}`} />

      <Tabs defaultValue="monthly">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="monthly" className="flex-1 sm:flex-none">
            Resoconto mensile
          </TabsTrigger>
          <TabsTrigger value="annual" className="flex-1 sm:flex-none">
            Resoconto annuale
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_LABELS_FULL.map((label, i) => (
                  <SelectItem key={label} value={String(i + 1)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loading && (
              <span className="text-sm text-muted-foreground">Caricamento…</span>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title={`Entrate — ${monthLabel}`}
              value={formatAmount(monthlyReport.income, currency, locale)}
              icon={TrendingUp}
              iconClassName="bg-success/10 text-success"
              valueClassName="text-success"
              borderClassName="border-success/30"
            />
            <StatCard
              title={`Uscite — ${monthLabel}`}
              value={formatAmount(monthlyReport.expense, currency, locale)}
              icon={TrendingDown}
              iconClassName="bg-danger/10 text-danger"
              valueClassName="text-danger"
              borderClassName="border-danger/30"
            />
            <StatCard
              title="Saldo netto"
              value={formatAmount(monthlyReport.net, currency, locale)}
              icon={Wallet}
              iconClassName="bg-primary/10 text-primary"
            />
          </div>

          {hasMonthlyExpenses && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Distribuzione spese — {monthLabel}</CardTitle>
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
                  <CardTitle>Spese per categoria — {monthLabel}</CardTitle>
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
              <CardTitle>Dettaglio spese per categoria — {monthLabel}</CardTitle>
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
                <CardTitle>Spese giornaliere — {monthLabel}</CardTitle>
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
                <CardTitle>Spese giornaliere — {monthLabel}</CardTitle>
              </CardHeader>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nessuna spesa registrata in questo mese.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="annual" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title={`Entrate totali ${year}`}
              value={formatAmount(annualReport.income, currency, locale)}
              icon={TrendingUp}
              iconClassName="bg-success/10 text-success"
              valueClassName="text-success"
              borderClassName="border-success/30"
            />
            <StatCard
              title={`Uscite totali ${year}`}
              value={formatAmount(annualReport.expense, currency, locale)}
              icon={TrendingDown}
              iconClassName="bg-danger/10 text-danger"
              valueClassName="text-danger"
              borderClassName="border-danger/30"
            />
            <StatCard
              title="Saldo netto annuale"
              value={formatAmount(annualReport.net, currency, locale)}
              icon={Wallet}
              iconClassName="bg-primary/10 text-primary"
            />
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Trend mensile</CardTitle>
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
                    dataKey="Entrate"
                    fill="var(--success)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={isMobile ? 14 : 28}
                  />
                  <Bar
                    dataKey="Uscite"
                    fill="var(--danger)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={isMobile ? 14 : 28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Spese per categoria — anno {year}</CardTitle>
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
