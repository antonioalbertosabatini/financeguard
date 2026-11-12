"use client";

import { ArrowLeftRight, Pencil, Repeat, Trash2 } from "lucide-react";
import { AccountIcon } from "@/components/accounts/account-icon";
import { Amount } from "@/components/common/amount";
import { CategoryBadgeIcon } from "@/components/common/category-badge-icon";
import { TagBadges } from "@/components/tags/tag-badges";
import { isUncategorized, UncategorizedBadge } from "@/components/transactions/uncategorized-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Account } from "@/lib/schemas/account";
import type { Category } from "@/lib/schemas/category";
import type { Transaction } from "@/lib/schemas/transaction";
import { getOccurrenceMonthLabel, getRecurrenceIntervalLabel } from "@/lib/utils/recurrence";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

interface TransactionRowProps {
  tx: Transaction;
  kind: "rule" | "occurrence";
  category?: Category;
  account?: Account;
  year: number;
  currency: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Present only when the row can be converted into a transfer. */
  onConvert?: () => void;
}

/**
 * One transaction, same component on phone and desktop. The main area is a
 * single button (opens the detail); desktop actions are sibling buttons that
 * appear on hover/focus, so interactive elements are never nested.
 */
export function TransactionRow({
  tx,
  kind,
  category,
  account,
  year,
  currency,
  onOpen,
  onEdit,
  onDelete,
  onConvert,
}: TransactionRowProps) {
  const { t, language } = useI18n();
  const notes = tx.notes?.trim() ?? "";
  const title = notes || category?.name || t(`labels.transactionType.${tx.type}`);
  const subtitle = [notes ? category?.name : null, account?.name].filter(Boolean).join(" · ");
  const recurringLabel =
    kind === "rule" && tx.isRecurring
      ? t("transactions.recurring", { interval: getRecurrenceIntervalLabel(tx, year, language) })
      : kind === "occurrence"
        ? t("transactions.occurrence", { label: getOccurrenceMonthLabel(tx.date, year, language) })
        : null;

  return (
    <div className="group relative flex items-center transition-colors hover:bg-surface-2 focus-within:bg-surface-2">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left outline-none sm:px-5"
      >
        {tx.type === "transfer" ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted-foreground" aria-hidden="true">
            <ArrowLeftRight className="size-[1.125rem]" />
          </span>
        ) : (
          <CategoryBadgeIcon icon={category?.icon} color={category?.color} />
        )}

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[0.9375rem] font-semibold">{title}</span>
            {isUncategorized(tx) && <UncategorizedBadge />}
            {recurringLabel && (
              <Badge variant="soft" className="hidden h-5 shrink-0 gap-1 px-2 text-[0.6875rem] sm:inline-flex">
                <Repeat className="size-3" aria-hidden="true" />
                {recurringLabel}
              </Badge>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
            {recurringLabel && <Repeat className="size-3 shrink-0 sm:hidden" aria-label={recurringLabel} />}
            <span className="truncate md:hidden">{subtitle}</span>
            <span className="hidden truncate md:inline">{notes ? category?.name : null}</span>
            {(tx.tags?.length ?? 0) > 0 && (
              <TagBadges tags={tx.tags ?? []} className="ml-1 hidden flex-nowrap lg:flex" />
            )}
          </span>
        </span>

        {/* Desktop: account column */}
        <span className="hidden w-40 shrink-0 items-center gap-2 truncate text-sm text-muted-foreground md:flex">
          {account && (
            <>
              <AccountIcon name={account.icon} className="size-4 shrink-0" />
              <span className="truncate">{account.name}</span>
            </>
          )}
        </span>

        <Amount
          cents={tx.amount}
          currency={currency}
          kind={tx.type}
          className={cn(
            "shrink-0 text-right text-[0.9375rem] font-semibold md:w-28",
            tx.type === "expense" && "text-foreground"
          )}
        />
      </button>

      {/* Desktop quick actions */}
      <div className="hidden w-[6.5rem] shrink-0 items-center justify-end gap-1 pr-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:flex">
        {onConvert && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onConvert}
            aria-label={t("transactions.convertToTransfer.button")}
            title={t("transactions.convertToTransfer.button")}
          >
            <ArrowLeftRight />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`${t("common.edit")}: ${title}`} title={t("common.edit")}>
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          aria-label={`${t("common.delete")}: ${title}`}
          title={t("common.delete")}
          className="hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
