"use client";

import { useMemo } from "react";
import {
  Bar,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import type { PlanListItem, StockListItem } from "@/components/plans/plans-view";
import { useFormatCents } from "@/hooks/use-format-cents";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { getMonthLabels } from "@/lib/i18n/translate";
import { accumulationAsOfISO } from "@/lib/utils/accumulation";
import {
  OTHERS_SLICE_ID,
  buildAllocation,
  buildContributionTimeline,
  summarizeInvestments,
  type InvestmentInstrument,
} from "@/lib/utils/investment-summary";
import { useAmountVisibility } from "@/providers/amount-visibility-provider";
import { useI18n } from "@/providers/i18n-provider";

const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
const OTHERS_COLOR = "var(--muted-foreground)";
// One color per slice: the largest four plus "others" when there are more.
const MAX_SLICES = SLICE_COLORS.length;

export function InvestmentSummary({
  items,
  holdings,
  year,
  currency,
  locale,
}: {
  items: PlanListItem[];
  holdings: StockListItem[];
  year: number;
  currency: string;
  locale: string;
}) {
  const { t, language } = useI18n();
  const formatAmount = useFormatCents();
  const { amountsHidden } = useAmountVisibility();
  const isMobile = useIsMobile();
  const tooltipTrigger = isMobile ? "click" : "hover";

  const instruments = useMemo<InvestmentInstrument[]>(
    () => [
      ...items.map((item) => ({
        id: item.id,
        name: item.name,
        kind: "plan" as const,
        invested: item.lifetimeBalance,
        yearInvested: item.yearBalance,
      })),
      ...holdings.map((item) => ({
        id: item.id,
        name: item.name,
        kind: "stock" as const,
        invested: item.invested,
        yearInvested: item.yearInvested,
      })),
    ],
    [items, holdings]
  );

  const summary = useMemo(() => summarizeInvestments(instruments), [instruments]);

  const othersLabel = t("plans.summary.others");
  const slices = useMemo(
    () =>
      buildAllocation(instruments, MAX_SLICES).map((slice, index) => ({
        ...slice,
        name: slice.id === OTHERS_SLICE_ID ? othersLabel : slice.name,
        color: slice.id === OTHERS_SLICE_ID ? OTHERS_COLOR : SLICE_COLORS[index],
      })),
    [instruments, othersLabel]
  );

  const monthLabels = useMemo(() => getMonthLabels(language), [language]);
  const periodLabel = t("plans.summary.period");
  const cumulativeLabel = t("plans.summary.cumulative");
  const timeline = useMemo(() => {
    const contributions = [
      ...items.flatMap((item) => item.lifetimePosted),
      ...holdings.flatMap((item) => item.lifetimePosted),
    ];
    return buildContributionTimeline(contributions, accumulationAsOfISO(year)).map(
      (point) => ({
        name:
          point.period === "month" && point.month
            ? `${monthLabels[point.month - 1]} ${String(point.year).slice(2)}`
            : String(point.year),
        [periodLabel]: point.amount / 100,
        [cumulativeLabel]: point.cumulative / 100,
      })
    );
  }, [items, holdings, year, monthLabels, periodLabel, cumulativeLabel]);

  const axisFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [locale, currency]
  );
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 1,
      }),
    [locale]
  );

  if (summary.total <= 0) return null;

  const axisTick = (value: number) =>
    amountsHidden ? "••" : axisFormatter.format(Number(value));

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/75 p-6 text-primary-foreground shadow-card">
        <div
          aria-hidden
          className="absolute -top-16 -right-12 size-48 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative">
          <p className="text-sm font-medium text-primary-foreground/80">
            {t("plans.summary.totalInvested")}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
            {formatAmount(summary.total, currency, locale)}
          </p>
          <p className="mt-1 text-sm text-primary-foreground/80">
            {t("plans.summary.ofWhichYear", { year })}:{" "}
            <span className="font-semibold tabular-nums">
              {formatAmount(summary.yearTotal, currency, locale)}
            </span>
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-primary-foreground/70">
                {t("plans.summary.indexes")}
              </p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {formatAmount(summary.plansTotal, currency, locale)}
              </p>
            </div>
            <div>
              <p className="text-primary-foreground/70">
                {t("plans.summary.stocks")}
              </p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {formatAmount(summary.stocksTotal, currency, locale)}
              </p>
            </div>
            <div>
              <p className="text-primary-foreground/70">
                {t("plans.summary.instruments")}
              </p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {summary.instruments}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-primary-foreground/70">
            {t("plans.summary.footnote")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>{t("plans.summary.whereTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 52 : 58}
                    outerRadius={isMobile ? 84 : 92}
                    paddingAngle={2}
                  >
                    {slices.map((slice) => (
                      <Cell key={slice.id} fill={slice.color} stroke="none" />
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
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1.5 text-sm">
              {slices.map((slice) => (
                <li key={slice.id} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="min-w-0 flex-1 truncate">{slice.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {percentFormatter.format(slice.share)}
                  </span>
                  <span className="w-28 text-right font-medium tabular-nums">
                    {formatAmount(slice.amount, currency, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>{t("plans.summary.whenTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] sm:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={timeline}
                margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  fontSize={isMobile ? 10 : 11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={12}
                  tickMargin={6}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  yAxisId="period"
                  fontSize={isMobile ? 10 : 11}
                  width={isMobile ? 38 : 44}
                  tickLine={false}
                  axisLine={false}
                  stroke="var(--muted-foreground)"
                  tickFormatter={axisTick}
                />
                <YAxis
                  yAxisId="cumulative"
                  orientation="right"
                  fontSize={isMobile ? 10 : 11}
                  width={isMobile ? 38 : 44}
                  tickLine={false}
                  axisLine={false}
                  stroke="var(--muted-foreground)"
                  tickFormatter={axisTick}
                />
                <Tooltip
                  trigger={tooltipTrigger}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  content={<ChartTooltip currency={currency} locale={locale} />}
                />
                <Legend
                  iconType="circle"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar
                  yAxisId="period"
                  dataKey={periodLabel}
                  fill="var(--chart-1)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={isMobile ? 14 : 28}
                />
                <Line
                  yAxisId="cumulative"
                  type="monotone"
                  dataKey={cumulativeLabel}
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
