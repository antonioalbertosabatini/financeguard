"use client";

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
import { TrendingDown, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAmountVisibility } from "@/hooks/use-amount-visibility";
import { useFormatCents } from "@/hooks/use-format-cents";
import { MONTH_LABELS } from "@/lib/constants";

type DashboardProps = {
  totalBalance: number;
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
        <p className={`text-3xl font-bold tracking-tight tabular-nums ${valueClassName ?? ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export function DashboardView({
  totalBalance,
  monthlyIncome,
  monthlyExpense,
  currency,
  locale,
  expensesByCategory,
  monthlyTrend,
}: DashboardProps) {
  const formatAmount = useFormatCents();
  const { amountsHidden } = useAmountVisibility();

  const trendData = monthlyTrend.map((m) => ({
    name: MONTH_LABELS[m.month - 1],
    Entrate: m.income / 100,
    Uscite: m.expense / 100,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Panoramica finanziaria dell'anno selezionato"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Saldo totale"
          value={formatAmount(totalBalance, currency, locale)}
          icon={Wallet}
          iconClassName="bg-primary/10 text-primary"
        />
        <StatCard
          title="Entrate mese corrente"
          value={formatAmount(monthlyIncome, currency, locale)}
          icon={TrendingUp}
          iconClassName="bg-emerald-500/10 text-emerald-600"
          valueClassName="text-emerald-600"
          borderClassName="border-emerald-200/60"
        />
        <StatCard
          title="Uscite mese corrente"
          value={formatAmount(monthlyExpense, currency, locale)}
          icon={TrendingDown}
          iconClassName="bg-rose-500/10 text-rose-600"
          valueClassName="text-rose-600"
          borderClassName="border-rose-200/60"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Spese per categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {expensesByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna spesa registrata</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name }) => name}
                  >
                    {expensesByCategory.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      formatAmount(Number(value), currency, locale)
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Andamento mensile</CardTitle>
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
      </div>
    </div>
  );
}
