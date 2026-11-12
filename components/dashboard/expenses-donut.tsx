"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { chartDonut } from "@/components/charts/chart-theme";
import { Amount } from "@/components/common/amount";
import { EmptyState } from "@/components/common/empty-state";
import { SectionHeader } from "@/components/common/section-header";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useI18n } from "@/providers/i18n-provider";

interface ExpensesDonutProps {
  items: { name: string; color: string; amount: number }[];
  currency: string;
  locale: string;
  className?: string;
}

/** Top categories are shown individually; the rest are grouped as "Other". */
const MAX_SLICES = 5;

export function ExpensesDonut({ items, currency, locale, className }: ExpensesDonutProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();

  const { slices, total } = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.amount - a.amount);
    const total = sorted.reduce((sum, i) => sum + i.amount, 0);
    if (sorted.length <= MAX_SLICES) return { slices: sorted, total };
    const head = sorted.slice(0, MAX_SLICES - 1);
    const rest = sorted.slice(MAX_SLICES - 1).reduce((sum, i) => sum + i.amount, 0);
    return {
      slices: [...head, { name: t("dashboard.other"), color: "var(--muted-foreground)", amount: rest }],
      total,
    };
  }, [items, t]);

  return (
    <section className={className}>
      <SectionHeader title={t("dashboard.expensesByCategory")} />
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        {slices.length === 0 ? (
          <EmptyState variant="plain" icon={PieIcon} title={t("dashboard.noExpenses")} className="py-6" />
        ) : (
          <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
            <div className="relative size-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie {...chartDonut} data={slices} dataKey="amount" nameKey="name">
                    {slices.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    trigger={isMobile ? "click" : "hover"}
                    content={<ChartTooltip currency={currency} locale={locale} valueScale={1} hideLabel />}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted-foreground">{t("dashboard.total")}</span>
                <Amount cents={total} currency={currency} className="text-[0.9375rem] font-bold" />
              </div>
            </div>
            <ul className="w-full min-w-0 flex-1 space-y-2.5">
              {slices.map((s) => {
                const pct = total > 0 ? Math.round((s.amount / total) * 100) : 0;
                return (
                  <li key={s.name} className="flex items-center gap-2.5 text-sm">
                    <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className="font-semibold tabular-nums">{pct}%</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
