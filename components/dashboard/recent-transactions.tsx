"use client";

import Link from "next/link";
import { ArrowLeftRight, ChevronRight, Plus } from "lucide-react";
import { Amount } from "@/components/common/amount";
import { CategoryBadgeIcon } from "@/components/common/category-badge-icon";
import { EmptyState } from "@/components/common/empty-state";
import { SectionHeader } from "@/components/common/section-header";
import { Stagger, StaggerItem } from "@/components/common/motion";
import { Button } from "@/components/ui/button";
import { useYearHref } from "@/hooks/use-year-href";
import { useI18n } from "@/providers/i18n-provider";
import { relativeDayLabel } from "@/lib/utils/relative-day";
import { cn } from "@/lib/utils";

export interface RecentTransaction {
  id: string;
  transactionId: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  date: string;
  notes: string;
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
}

export function RecentTransactions({
  items,
  currency,
  className,
}: {
  items: RecentTransaction[];
  currency: string;
  className?: string;
}) {
  const { t, language } = useI18n();
  const withYear = useYearHref();
  const dayLabels = { today: t("common.today"), yesterday: t("common.yesterday") };

  return (
    <section className={className}>
      <SectionHeader
        title={t("dashboard.recentTransactions")}
        action={
          items.length > 0 && (
            <Link
              href={withYear("/transactions")}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t("dashboard.seeAll")}
            </Link>
          )
        }
      />
      <div className="rounded-xl border border-border bg-card py-1.5 shadow-soft">
        {items.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={ArrowLeftRight}
            title={t("dashboard.noRecent")}
            description={t("dashboard.noRecentDescription")}
            action={
              <Button asChild size="sm">
                <Link href={withYear("/add")}>
                  <Plus />
                  {t("nav.newTransaction")}
                </Link>
              </Button>
            }
          />
        ) : (
          <Stagger stagger={0.04} delay={0.1}>
            {items.map((tx) => {
              const title = tx.notes.trim() || tx.categoryName || t("palette.uncategorized");
              return (
                <StaggerItem key={tx.id}>
                  <Link
                    href={withYear(`/transactions?tx=${tx.transactionId}`)}
                    className="group flex items-center gap-3 px-4 py-2.5 outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 sm:px-5"
                  >
                    <CategoryBadgeIcon icon={tx.categoryIcon} color={tx.categoryColor} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-semibold">
                        {title}
                      </span>
                      <span className="block truncate text-[0.8125rem] text-muted-foreground">
                        {[tx.notes.trim() ? tx.categoryName : null, relativeDayLabel(tx.date, language, dayLabels)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <Amount
                      cents={tx.amount}
                      currency={currency}
                      kind={tx.type}
                      className={cn(
                        "text-[0.9375rem] font-semibold",
                        tx.type === "expense" && "text-foreground"
                      )}
                    />
                    <ChevronRight
                      className="-mr-1 hidden size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:block"
                      aria-hidden="true"
                    />
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </div>
    </section>
  );
}
