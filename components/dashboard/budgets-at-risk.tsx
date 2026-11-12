"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CheckCircle2, PiggyBank, Plus } from "lucide-react";
import { Amount } from "@/components/common/amount";
import { CategoryBadgeIcon } from "@/components/common/category-badge-icon";
import { EmptyState } from "@/components/common/empty-state";
import { SectionHeader } from "@/components/common/section-header";
import { Button } from "@/components/ui/button";
import { useYearHref } from "@/hooks/use-year-href";
import { useI18n } from "@/providers/i18n-provider";
import { EASE_FLUID } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface BudgetAtRisk {
  id: string;
  name: string;
  icon: string;
  color: string;
  spent: number;
  limit: number;
  ratio: number;
}

export function BudgetsAtRisk({
  items,
  budgetsCount,
  currency,
  className,
}: {
  items: BudgetAtRisk[];
  budgetsCount: number;
  currency: string;
  className?: string;
}) {
  const { t } = useI18n();
  const withYear = useYearHref();

  return (
    <section className={className}>
      <SectionHeader
        title={t("dashboard.budgetsAtRisk")}
        action={
          budgetsCount > 0 && (
            <Link
              href={withYear("/budget")}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t("dashboard.seeAll")}
            </Link>
          )
        }
      />
      <div className="rounded-xl border border-border bg-card shadow-soft">
        {budgetsCount === 0 ? (
          <EmptyState
            variant="plain"
            icon={PiggyBank}
            title={t("dashboard.noBudgets")}
            description={t("dashboard.noBudgetsDescription")}
            action={
              <Button asChild size="sm" variant="soft">
                <Link href={withYear("/budget")}>
                  <Plus />
                  {t("dashboard.createBudget")}
                </Link>
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={CheckCircle2}
            title={t("dashboard.budgetsAllGood")}
            description={t("dashboard.budgetsAllGoodDescription")}
          />
        ) : (
          <ul className="divide-y divide-border px-4 sm:px-5">
            {items.map((b, index) => {
              const over = b.ratio >= 1;
              const percent = Math.round(b.ratio * 100);
              return (
                <li key={b.id} className="py-3.5">
                  <div className="flex items-center gap-3">
                    <CategoryBadgeIcon icon={b.icon} color={b.color} className="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9375rem] font-semibold">{b.name}</p>
                      <p
                        className={cn(
                          "truncate text-[0.8125rem]",
                          over ? "font-medium text-danger" : "text-muted-foreground"
                        )}
                      >
                        {over ? (
                          <>
                            {t("budget.overBudget")}{" "}
                            <Amount cents={b.spent - b.limit} currency={currency} />
                          </>
                        ) : (
                          <>
                            <Amount cents={b.spent} currency={currency} /> /{" "}
                            <Amount cents={b.limit} currency={currency} />
                          </>
                        )}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        over ? "text-danger" : "text-warning"
                      )}
                    >
                      {percent}%
                    </span>
                  </div>
                  <div
                    className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={b.name}
                  >
                    <motion.div
                      className={cn("h-full origin-left rounded-full", over ? "bg-danger" : "bg-warning")}
                      style={{ width: `${Math.min(100, percent)}%` }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.8, ease: EASE_FLUID, delay: 0.2 + index * 0.08 }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
