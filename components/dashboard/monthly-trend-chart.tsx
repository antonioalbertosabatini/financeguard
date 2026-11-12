"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { chartAxis, chartBar, chartColors, chartCursor, chartGrid } from "@/components/charts/chart-theme";
import { SectionHeader } from "@/components/common/section-header";
import { useFormatCents } from "@/hooks/use-format-cents";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { getMonthLabels } from "@/lib/i18n/translate";
import { useAmountVisibility } from "@/providers/amount-visibility-provider";
import { useI18n } from "@/providers/i18n-provider";

interface MonthlyTrendChartProps {
  data: { month: number; income: number; expense: number }[];
  year: number;
  currency: string;
  locale: string;
  className?: string;
}

/** Compact axis labels: 1,2k / 15k instead of full currency strings. */
function compact(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function MonthlyTrendChart({ data, year, currency, locale, className }: MonthlyTrendChartProps) {
  const { t, language } = useI18n();
  const isMobile = useIsMobile();
  const { amountsHidden } = useAmountVisibility();
  const formatAmount = useFormatCents();
  const monthLabels = useMemo(() => getMonthLabels(language), [language]);
  const incomeLabel = t("labels.chart.income");
  const expenseLabel = t("labels.chart.expense");

  const chartData = useMemo(
    () =>
      data.map((m) => ({
        name: monthLabels[m.month - 1],
        [incomeLabel]: m.income / 100,
        [expenseLabel]: m.expense / 100,
      })),
    [data, monthLabels, incomeLabel, expenseLabel]
  );

  return (
    <section className={className}>
      <SectionHeader
        title={t("dashboard.trendTitle", { year })}
        action={
          <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: chartColors.income }} />
              {incomeLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: chartColors.expense }} />
              {expenseLabel}
            </span>
          </div>
        }
      />
      <div className="h-[260px] rounded-xl border border-border bg-card px-2 pt-5 pb-2 shadow-soft sm:h-[300px] sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={3} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid {...chartGrid} />
            <XAxis {...chartAxis} dataKey="name" interval={isMobile ? 1 : 0} />
            <YAxis
              {...chartAxis}
              width={isMobile ? 40 : 46}
              tickFormatter={(v) => (amountsHidden ? "••" : compact(Number(v), locale))}
            />
            <Tooltip
              trigger={isMobile ? "click" : "hover"}
              cursor={chartCursor}
              content={<ChartTooltip currency={currency} locale={locale} />}
            />
            <Bar {...chartBar} dataKey={incomeLabel} fill={chartColors.income} />
            <Bar {...chartBar} dataKey={expenseLabel} fill={chartColors.expense} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Screen-reader summary of the chart. */}
      <p className="sr-only">
        {data
          .map(
            (m) =>
              `${monthLabels[m.month - 1]}: ${incomeLabel} ${formatAmount(m.income, currency)}, ${expenseLabel} ${formatAmount(m.expense, currency)}`
          )
          .join("; ")}
      </p>
    </section>
  );
}
