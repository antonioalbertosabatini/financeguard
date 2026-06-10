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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAmountVisibility } from "@/hooks/use-amount-visibility";
import { useFormatCents } from "@/hooks/use-format-cents";
import { getMonthlyReport } from "@/lib/actions/transactions";
import { MONTH_LABELS, MONTH_LABELS_FULL } from "@/lib/constants";
import { currentMonth } from "@/lib/utils/dates";

type CategoryAmount = {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
};

type MonthlyTrend = { month: number; income: number; expense: number };

type ReportsViewProps = {
  year: number;
  currency: string;
  locale: string;
  initialMonthlyReport: {
    income: number;
    expense: number;
    net: number;
    expensesByCategory: CategoryAmount[];
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
          className={`text-3xl font-bold tracking-tight tabular-nums ${valueClassName ?? ""}`}
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

  const chartData = data.map((c) => ({
    name: c.name,
    amount: c.amount / 100,
    color: c.color,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
        <XAxis
          type="number"
          fontSize={12}
          tickFormatter={(value) =>
            amountsHidden
              ? "••"
              : formatAmount(Number(value) * 100, currency, locale)
          }
        />
        <YAxis
          type="category"
          dataKey="name"
          fontSize={12}
          width={100}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(value) =>
            formatAmount(Number(value) * 100, currency, locale)
          }
        />
        <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
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
  const formatAmount = useFormatCents();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name }) => name}
        >
          {data.map((entry) => (
            <Cell key={entry.categoryId} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatAmount(Number(value), currency, locale)}
        />
      </PieChart>
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
        <TabsList>
          <TabsTrigger value="monthly">Resoconto mensile</TabsTrigger>
          <TabsTrigger value="annual">Resoconto annuale</TabsTrigger>
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
              iconClassName="bg-emerald-500/10 text-emerald-600"
              valueClassName="text-emerald-600"
              borderClassName="border-emerald-200/60"
            />
            <StatCard
              title={`Uscite — ${monthLabel}`}
              value={formatAmount(monthlyReport.expense, currency, locale)}
              icon={TrendingDown}
              iconClassName="bg-rose-500/10 text-rose-600"
              valueClassName="text-rose-600"
              borderClassName="border-rose-200/60"
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
                <CardContent className="h-[300px]">
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
        </TabsContent>

        <TabsContent value="annual" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title={`Entrate totali ${year}`}
              value={formatAmount(annualReport.income, currency, locale)}
              icon={TrendingUp}
              iconClassName="bg-emerald-500/10 text-emerald-600"
              valueClassName="text-emerald-600"
              borderClassName="border-emerald-200/60"
            />
            <StatCard
              title={`Uscite totali ${year}`}
              value={formatAmount(annualReport.expense, currency, locale)}
              icon={TrendingDown}
              iconClassName="bg-rose-500/10 text-rose-600"
              valueClassName="text-rose-600"
              borderClassName="border-rose-200/60"
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
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(value) =>
                      amountsHidden
                        ? "••"
                        : formatAmount(Number(value) * 100, currency, locale)
                    }
                  />
                  <Tooltip
                    formatter={(value) =>
                      formatAmount(Number(value) * 100, currency, locale)
                    }
                  />
                  <Legend />
                  <Bar dataKey="Entrate" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Uscite" fill="#ef4444" radius={[4, 4, 0, 0]} />
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
