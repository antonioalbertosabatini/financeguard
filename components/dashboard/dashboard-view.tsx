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
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
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
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Panoramica finanziaria dell'anno selezionato"
      />

      {/* Hero: total balance */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/75 p-6 text-primary-foreground shadow-card">
        <div
          aria-hidden
          className="absolute -top-16 -right-12 size-48 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative">
          <p className="text-sm font-medium text-primary-foreground/80">
            Saldo totale
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
            {formatAmount(totalBalance, currency, locale)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <FlowTile
          title="Entrate del mese"
          value={formatAmount(monthlyIncome, currency, locale)}
          icon={TrendingUp}
          tone="success"
        />
        <FlowTile
          title="Uscite del mese"
          value={formatAmount(monthlyExpense, currency, locale)}
          icon={TrendingDown}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Spese per categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] sm:h-[300px]">
            {expensesByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessuna spesa registrata
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={96}
                    paddingAngle={2}
                  >
                    {expensesByCategory.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      formatAmount(Number(value), currency, locale)
                    }
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Andamento mensile</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barGap={2}>
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  fontSize={11}
                  width={44}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    amountsHidden
                      ? "••"
                      : formatAmount(Number(value) * 100, currency, locale)
                  }
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  formatter={(value) =>
                    formatAmount(Number(value) * 100, currency, locale)
                  }
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Entrate" fill="var(--success)" radius={[5, 5, 0, 0]} />
                <Bar dataKey="Uscite" fill="var(--danger)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
