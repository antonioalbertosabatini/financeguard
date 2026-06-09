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
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMonthlyReport } from "@/lib/actions/transactions";
import { MONTH_LABELS, MONTH_LABELS_FULL } from "@/lib/constants";
import { formatCents } from "@/lib/utils/money";
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

export function ReportsView({
  year,
  currency,
  locale,
  initialMonthlyReport,
  annualReport,
}: ReportsViewProps) {
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Entrate — {MONTH_LABELS_FULL[monthNum - 1]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatCents(monthlyReport.income, currency, locale)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Uscite — {MONTH_LABELS_FULL[monthNum - 1]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {formatCents(monthlyReport.expense, currency, locale)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Saldo netto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCents(monthlyReport.net, currency, locale)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Spese per categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyReport.expensesByCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessuna spesa</p>
              ) : (
                <ul className="space-y-2">
                  {monthlyReport.expensesByCategory.map((c) => (
                    <li
                      key={c.categoryId}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                      <span className="font-medium">
                        {formatCents(c.amount, currency, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="annual" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Entrate totali {year}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatCents(annualReport.income, currency, locale)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Uscite totali {year}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {formatCents(annualReport.expense, currency, locale)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Saldo netto annuale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCents(annualReport.net, currency, locale)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Trend mensile</CardTitle>
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

          <Card>
            <CardHeader>
              <CardTitle>Spese per categoria — anno {year}</CardTitle>
            </CardHeader>
            <CardContent>
              {annualReport.expensesByCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessuna spesa</p>
              ) : (
                <ul className="space-y-2">
                  {annualReport.expensesByCategory.map((c) => (
                    <li
                      key={c.categoryId}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                      <span className="font-medium">
                        {formatCents(c.amount, currency, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
