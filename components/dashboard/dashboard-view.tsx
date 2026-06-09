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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/utils/money";
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

export function DashboardView({
  totalBalance,
  monthlyIncome,
  monthlyExpense,
  currency,
  locale,
  expensesByCategory,
  monthlyTrend,
}: DashboardProps) {
  const trendData = monthlyTrend.map((m) => ({
    name: MONTH_LABELS[m.month - 1],
    Entrate: m.income / 100,
    Uscite: m.expense / 100,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Panoramica finanziaria dell&apos;anno selezionato
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo totale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">
              {formatCents(totalBalance, currency, locale)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-emerald-200/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entrate mese corrente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-emerald-600">
              {formatCents(monthlyIncome, currency, locale)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-rose-200/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Uscite mese corrente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-rose-600">
              {formatCents(monthlyExpense, currency, locale)}
            </p>
          </CardContent>
        </Card>
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
                      formatCents(Number(value), currency, locale)
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
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Entrate" fill="#22c55e" />
                <Bar dataKey="Uscite" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
