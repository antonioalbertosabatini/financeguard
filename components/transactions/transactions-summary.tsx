"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Amount } from "@/components/common/amount";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getMonthLabelsFull } from "@/lib/i18n/translate";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

interface Totals {
  count: number;
  income: number;
  expense: number;
  net: number;
}

interface TransactionsSummaryProps {
  totals: Totals;
  monthly: (Totals & { monthKey: string })[];
  currency: string;
}

/** Income / expense / net of the filtered list, with an optional month-by-month breakdown. */
export function TransactionsSummary({ totals, monthly, currency }: TransactionsSummaryProps) {
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const monthNames = useMemo(() => getMonthLabelsFull(language), [language]);
  const monthLabel = (key: string) => `${monthNames[parseInt(key.slice(5, 7), 10) - 1]} ${key.slice(0, 4)}`;

  return (
    <div className="rounded-xl border border-border bg-card shadow-soft">
      <dl className="grid grid-cols-3 divide-x divide-border">
        <div className="min-w-0 px-3 py-3.5 sm:px-5">
          <dt className="text-xs text-muted-foreground sm:text-[0.8125rem]">{t("labels.chart.income")}</dt>
          <dd className="mt-0.5 truncate text-[0.8125rem] font-bold min-[400px]:text-[0.9375rem] sm:text-lg">
            <Amount cents={totals.income} currency={currency} kind="income" />
          </dd>
        </div>
        <div className="min-w-0 px-3 py-3.5 sm:px-5">
          <dt className="text-xs text-muted-foreground sm:text-[0.8125rem]">{t("labels.chart.expense")}</dt>
          <dd className="mt-0.5 truncate text-[0.8125rem] font-bold min-[400px]:text-[0.9375rem] sm:text-lg">
            <Amount cents={totals.expense} currency={currency} kind="expense" />
          </dd>
        </div>
        <div className="min-w-0 px-3 py-3.5 sm:px-5">
          <dt className="truncate text-xs text-muted-foreground sm:text-[0.8125rem]">
            {t("transactions.net")} · {totals.count}
          </dt>
          <dd className="mt-0.5 truncate text-[0.9375rem] font-bold text-primary sm:text-lg">
            <Amount cents={totals.net} currency={currency} />
          </dd>
        </div>
      </dl>

      {monthly.length > 1 && (
        <Collapsible open={open} onOpenChange={setOpen} className="border-t border-border">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground sm:px-5">
            {t("transactions.monthlyBreakdown")}
            <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="divide-y divide-border border-t border-border">
              {monthly.map((m) => (
                <li key={m.monthKey} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-sm sm:px-5">
                  <span className="font-medium">{monthLabel(m.monthKey)}</span>
                  <span className="flex items-center gap-3">
                    <Amount cents={m.income} currency={currency} kind="income" />
                    <Amount cents={m.expense} currency={currency} kind="expense" className="text-muted-foreground" />
                    <Amount cents={m.net} currency={currency} className="w-24 text-right font-semibold" />
                  </span>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
