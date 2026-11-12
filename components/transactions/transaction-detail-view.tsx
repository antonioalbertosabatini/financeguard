"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Repeat } from "lucide-react";
import { AccountIcon } from "@/components/accounts/account-icon";
import { Amount } from "@/components/common/amount";
import { CategoryBadgeIcon } from "@/components/common/category-badge-icon";
import { Badge } from "@/components/ui/badge";
import { TagBadges } from "@/components/tags/tag-badges";
import { isUncategorized, UncategorizedBadge } from "@/components/transactions/uncategorized-badge";
import { useYearHref } from "@/hooks/use-year-href";
import type { Account } from "@/lib/schemas/account";
import type { Category } from "@/lib/schemas/category";
import type { Transaction } from "@/lib/schemas/transaction";
import { useI18n } from "@/providers/i18n-provider";
import { formatDate } from "@/lib/utils/dates";
import { getOccurrenceMonthLabel, getRecurrenceIntervalLabel } from "@/lib/utils/recurrence";

type TransactionDetailViewProps = {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  year: number;
  currency: string;
  locale: string;
  listContext?: { kind: "rule" | "occurrence"; displayDate: string };
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-semibold">{children}</dd>
    </div>
  );
}

/** Read-only transaction detail: big amount on top, then a definition list. */
export function TransactionDetailView({
  transaction,
  accounts,
  categories,
  year,
  currency,
  listContext,
}: TransactionDetailViewProps) {
  const { t, language } = useI18n();
  const withYear = useYearHref();

  if (transaction.type === "transfer") {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        {t("transactions.transferManagedInAccounts")}{" "}
        <Link href={withYear("/accounts")} className="font-semibold text-primary underline">
          {t("nav.accounts")}
        </Link>
        .
      </div>
    );
  }

  const category = transaction.categoryId
    ? categories.find((c) => c.id === transaction.categoryId)
    : undefined;
  const account = accounts.find((a) => a.id === transaction.accountId);
  const displayDate = listContext?.displayDate ?? transaction.date;
  const notes = transaction.notes?.trim();
  const dateFmt = (iso: string) => formatDate(iso, "d MMMM yyyy", language);

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center pt-1 text-center">
        <CategoryBadgeIcon
          icon={category?.icon}
          color={category?.color}
          className="size-14 rounded-2xl"
          iconClassName="size-7"
        />
        <p className="mt-3 text-[2.125rem] leading-tight font-bold tracking-[-0.03em]">
          <Amount
            cents={transaction.amount}
            currency={currency}
            kind={transaction.type}
            className={transaction.type === "expense" ? "text-foreground" : undefined}
          />
        </p>
        <p className="mt-0.5 text-base font-semibold">
          {notes || category?.name || t(`labels.transactionType.${transaction.type}`)}
        </p>
        <Badge variant={transaction.type === "income" ? "success" : "danger"} className="mt-2">
          {t(`labels.transactionType.${transaction.type}`)}
        </Badge>
      </div>

      <dl className="divide-y divide-border rounded-xl bg-surface-2 px-4">
        <Row label={t("common.category")}>
          {category ? (
            category.name
          ) : isUncategorized(transaction) ? (
            <UncategorizedBadge />
          ) : (
            t("common.none")
          )}
        </Row>
        <Row label={t("common.date")}>
          <span className="tabular-nums">{dateFmt(displayDate)}</span>
          {listContext?.kind === "occurrence" && (
            <span className="block text-xs font-medium text-muted-foreground">
              {t("transactions.occurrence", { label: getOccurrenceMonthLabel(displayDate, year, language) })}
            </span>
          )}
        </Row>
        <Row label={t("common.account")}>
          {account ? (
            <span className="inline-flex items-center gap-1.5">
              <AccountIcon name={account.icon} className="size-4 text-muted-foreground" />
              {account.name}
            </span>
          ) : (
            t("common.none")
          )}
        </Row>
        {notes && category && <Row label={t("common.notes")}>{notes}</Row>}
        {(transaction.tags?.length ?? 0) > 0 && (
          <Row label={t("common.tags")}>
            <TagBadges tags={transaction.tags ?? []} className="justify-end" />
          </Row>
        )}
      </dl>

      {transaction.isRecurring && (
        <div className="rounded-xl border border-border p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Repeat className="size-4 text-primary" aria-hidden="true" />
            {t("transactions.recurring", { interval: getRecurrenceIntervalLabel(transaction, year, language) })}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">{t("transactions.form.recurrenceStart")}</dt>
              <dd className="font-semibold tabular-nums">
                {dateFmt(transaction.recurrenceStart ?? transaction.date)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("transactions.form.recurrenceEnd")}</dt>
              <dd className="font-semibold tabular-nums">
                {transaction.recurrenceEnd
                  ? dateFmt(transaction.recurrenceEnd)
                  : t("transactions.detail.endOfYear")}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
