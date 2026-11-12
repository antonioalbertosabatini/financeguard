"use client";

import { motion } from "motion/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { AccountIcon } from "@/components/accounts/account-icon";
import { CategoryIcon } from "@/components/categories/category-icon";
import { TRANSACTION_FORM_TYPES } from "@/lib/constants";
import { transitions } from "@/lib/motion";
import type { Account } from "@/lib/schemas/account";
import type { Category } from "@/lib/schemas/category";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/native/haptics";

type FormType = (typeof TRANSACTION_FORM_TYPES)[number];

/** Expense / income segmented control with a sliding indicator. */
export function TypeToggle({
  value,
  onChange,
  idPrefix = "tx",
}: {
  value: FormType;
  onChange: (type: FormType) => void;
  idPrefix?: string;
}) {
  const { t } = useI18n();
  // Expense first: it's by far the most common entry.
  const order: FormType[] = ["expense", "income"];
  return (
    <div role="radiogroup" aria-label={t("common.type")} className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
      {order.map((type) => {
        const active = value === type;
        const Icon = type === "income" ? TrendingUp : TrendingDown;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              haptic("select");
              onChange(type);
            }}
            className={cn(
              "relative flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? (type === "income" ? "text-success" : "text-danger") : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={`${idPrefix}-type-indicator`}
                transition={transitions.indicator}
                className="absolute inset-0 rounded-lg bg-card shadow-soft"
                aria-hidden="true"
              />
            )}
            <Icon className="relative size-4" aria-hidden="true" />
            <span className="relative">{t(`labels.transactionType.${type}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Category grid: one tap instead of opening a select. */
export function CategoryPicker({
  categories,
  value,
  onChange,
  invalid,
  labelledBy,
}: {
  categories: Category[];
  value?: string;
  onChange: (id: string) => void;
  invalid?: boolean;
  labelledBy?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      className={cn(
        "grid max-h-64 grid-cols-4 gap-2 overflow-y-auto rounded-xl p-0.5 sm:grid-cols-5 md:grid-cols-6",
        invalid && "ring-2 ring-destructive/40"
      )}
    >
      {categories.map((c) => {
        const active = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              haptic("select");
              onChange(c.id);
            }}
            className={cn(
              "pressable flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "border-transparent ring-2 ring-primary" : "border-border bg-card hover:bg-surface-2"
            )}
            style={active ? { backgroundColor: `color-mix(in oklch, ${c.color} 14%, var(--card))` } : undefined}
          >
            <span
              className="flex size-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: `color-mix(in oklch, ${c.color} 15%, transparent)` }}
              aria-hidden="true"
            >
              <CategoryIcon name={c.icon} color={c.color} className="size-[1.125rem]" />
            </span>
            <span className={cn("w-full truncate text-center text-xs", active ? "font-semibold" : "font-medium")}>
              {c.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Account chips (horizontal scroll on phones). */
export function AccountPicker({
  accounts,
  value,
  onChange,
  labelledBy,
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
  labelledBy?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="-mx-1 flex gap-2 overflow-x-auto px-1 py-0.5 [scrollbar-width:none]"
    >
      {accounts.map((a) => {
        const active = value === a.id;
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              haptic("select");
              onChange(a.id);
            }}
            className={cn(
              "pressable inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-transparent bg-primary-soft text-primary-soft-foreground"
                : "border-border bg-card text-foreground hover:bg-surface-2"
            )}
          >
            <AccountIcon name={a.icon} className="size-4" />
            {a.name}
          </button>
        );
      })}
    </div>
  );
}
