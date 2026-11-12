"use client";

import { motion } from "motion/react";
import { ChevronDown, MoreHorizontal, Pencil, Tag, Trash2 } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Amount } from "@/components/common/amount";
import { CategoryBadgeIcon } from "@/components/common/category-badge-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EASE_FLUID } from "@/lib/motion";
import { formatDate } from "@/lib/utils/dates";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

export interface BudgetCardItem {
  id: string;
  name: string;
  icon: string;
  tag?: string;
  categoryId?: string;
  categoryName?: string;
  categoryColor: string;
  categoryIcon?: string;
  monthlyLimit: number;
  spent: number;
  expenses: {
    id: string;
    amount: number;
    date: string;
    notes: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon?: string;
  }[];
}

/** success < 80% ≤ warning < 100% ≤ danger */
export function budgetTone(ratio: number): "success" | "warning" | "danger" {
  if (ratio >= 1) return "danger";
  if (ratio >= 0.8) return "warning";
  return "success";
}

const TONE_BAR = { success: "bg-success", warning: "bg-warning", danger: "bg-danger" } as const;
const TONE_TEXT = { success: "text-success", warning: "text-warning", danger: "text-danger" } as const;

export function BudgetCard({
  item,
  currency,
  accentColor,
  index = 0,
  onEdit,
  onDelete,
}: {
  item: BudgetCardItem;
  currency: string;
  accentColor: string;
  index?: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, language } = useI18n();
  const ratio = item.monthlyLimit > 0 ? item.spent / item.monthlyLimit : 0;
  const percent = Math.round(ratio * 100);
  const tone = budgetTone(ratio);
  const remaining = item.monthlyLimit - item.spent;
  const over = remaining < 0;

  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-5 shadow-soft",
        over ? "border-danger/40" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CategoryBadgeIcon icon={item.icon} color={accentColor} className="size-11" iconClassName="size-5" />
          <div className="min-w-0">
            <h3 className="truncate text-[0.9375rem] font-semibold">{item.name}</h3>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {item.categoryName && (
                <Badge variant="secondary" className="h-5 gap-1 px-2 text-[0.6875rem] font-medium">
                  {item.categoryIcon && (
                    <CategoryIcon name={item.categoryIcon} color={item.categoryColor} className="size-3" />
                  )}
                  {item.categoryName}
                </Badge>
              )}
              {item.tag && (
                <Badge variant="secondary" className="h-5 gap-1 px-2 text-[0.6875rem] font-medium">
                  <Tag className="size-3" aria-hidden="true" />
                  {item.tag}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t("budget.editAria", { name: item.name })} className="-mt-1 -mr-1.5 text-muted-foreground">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              {t("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete} aria-label={t("budget.deleteAria", { name: item.name })}>
              <Trash2 />
              {t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="text-[1.375rem] leading-none font-bold tracking-tight">
          <Amount cents={item.spent} currency={currency} />
          <span className="ml-1.5 text-sm font-medium text-muted-foreground">
            / <Amount cents={item.monthlyLimit} currency={currency} />
          </span>
        </p>
        <span className={cn("text-sm font-bold tabular-nums", TONE_TEXT[tone])}>{percent}%</span>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("budget.usedPercent", { percent })}
      >
        <motion.div
          className={cn("h-full origin-left rounded-full", TONE_BAR[tone])}
          style={{ width: `${Math.min(100, percent)}%` }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, ease: EASE_FLUID, delay: 0.1 + index * 0.06 }}
        />
      </div>

      <p className={cn("mt-2 text-[0.8125rem] font-medium", over ? "text-danger" : "text-muted-foreground")}>
        {over ? t("budget.overBudget") : t("budget.remaining")}{" "}
        <Amount cents={Math.abs(remaining)} currency={currency} className="font-semibold" />
        <span className="text-muted-foreground">
          {" · "}
          {item.expenses.length} {item.expenses.length === 1 ? t("budget.expenseSingular") : t("budget.expensePlural")}
        </span>
      </p>

      {item.expenses.length > 0 && (
        <Collapsible className="mt-4 border-t border-border pt-1">
          <CollapsibleTrigger className="group flex w-full items-center justify-between py-2 text-sm font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground">
            {t("budget.expenseDetails")}
            <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="divide-y divide-border">
              {item.expenses.map((expense) => (
                <li key={expense.id} className="flex items-center gap-3 py-2.5">
                  <CategoryBadgeIcon icon={expense.categoryIcon} color={expense.categoryColor} className="size-8 rounded-lg" iconClassName="size-4" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {expense.notes || expense.categoryName}
                    </span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {formatDate(expense.date, "d MMM", language)}
                    </span>
                  </span>
                  <Amount cents={expense.amount} currency={currency} kind="expense" className="text-sm font-semibold" />
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </article>
  );
}
