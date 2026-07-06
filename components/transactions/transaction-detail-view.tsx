"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  Calendar,
  Euro,
  FileText,
  Repeat,
  Tag,
  Tags,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { AccountIcon } from "@/components/accounts/account-icon";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { TagBadges } from "@/components/tags/tag-badges";
import { TRANSACTION_TYPE_LABELS } from "@/lib/constants";
import type { Account } from "@/lib/schemas/account";
import type { Category } from "@/lib/schemas/category";
import type { Transaction } from "@/lib/schemas/transaction";
import { useAmountVisibility } from "@/providers/amount-visibility-provider";
import { formatDate } from "@/lib/utils/dates";
import { formatSignedCents } from "@/lib/utils/money";
import {
  getOccurrenceMonthLabel,
  getRecurrenceIntervalLabel,
} from "@/lib/utils/recurrence";
import { cn } from "@/lib/utils";

const TYPE_BADGE_CLASS: Record<Transaction["type"], string> = {
  income: "bg-success/10 text-success hover:bg-success/10",
  expense: "bg-danger/10 text-danger hover:bg-danger/10",
  transfer: "bg-muted text-muted-foreground hover:bg-muted",
};

type TransactionDetailViewProps = {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  year: number;
  currency: string;
  locale: string;
  listContext?: { kind: "rule" | "occurrence"; displayDate: string };
};

function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Label className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="size-3.5" />
      {children}
    </Label>
  );
}

function DetailValue({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-sm font-medium", className)}>{children}</p>;
}

export function TransactionDetailView({
  transaction,
  accounts,
  categories,
  year,
  currency,
  locale,
  listContext,
}: TransactionDetailViewProps) {
  const { amountsHidden } = useAmountVisibility();

  if (transaction.type === "transfer") {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        I trasferimenti si gestiscono dalla sezione{" "}
        <Link href={`/accounts?year=${year}`} className="font-medium text-primary underline">
          Conti
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
  const amountDisplay = formatSignedCents(
    transaction.amount,
    transaction.type,
    currency,
    locale,
    amountsHidden
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <FieldLabel icon={ArrowLeftRight}>Tipo</FieldLabel>
          <Badge variant="secondary" className={cn("w-fit", TYPE_BADGE_CLASS[transaction.type])}>
            {TRANSACTION_TYPE_LABELS[transaction.type]}
          </Badge>
        </div>

        <div className="space-y-2 md:col-span-2">
          <FieldLabel icon={Euro}>Importo (€)</FieldLabel>
          <DetailValue
            className={cn(
              "text-2xl tabular-nums",
              transaction.type === "income" && "text-success",
              transaction.type === "expense" && "text-danger"
            )}
          >
            {amountDisplay}
          </DetailValue>
        </div>

        <div className="space-y-2">
          <FieldLabel icon={Calendar}>Data</FieldLabel>
          <DetailValue className="tabular-nums">{formatDate(displayDate)}</DetailValue>
          {listContext?.kind === "occurrence" && (
            <Badge variant="outline" className="mt-1 w-fit text-xs">
              Occorrenza · {getOccurrenceMonthLabel(displayDate, year)}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <FieldLabel icon={Tags}>Categoria</FieldLabel>
          {category ? (
            <span className="flex items-center gap-2 text-sm font-medium">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${category.color}1a` }}
              >
                <CategoryIcon name={category.icon} color={category.color} className="size-4" />
              </span>
              {category.name}
            </span>
          ) : (
            <DetailValue className="text-muted-foreground">—</DetailValue>
          )}
        </div>

        <div className="space-y-2">
          <FieldLabel icon={Wallet}>Conto</FieldLabel>
          {account ? (
            <span className="flex items-center gap-2 text-sm font-medium">
              <AccountIcon name={account.icon} className="size-4 text-muted-foreground" />
              {account.name}
            </span>
          ) : (
            <DetailValue className="text-muted-foreground">—</DetailValue>
          )}
        </div>

        <div className="space-y-2">
          <FieldLabel icon={FileText}>Note</FieldLabel>
          <DetailValue className={cn(!transaction.notes && "text-muted-foreground")}>
            {transaction.notes || "—"}
          </DetailValue>
        </div>

        <div className="space-y-2">
          <FieldLabel icon={Tag}>Tag</FieldLabel>
          {(transaction.tags?.length ?? 0) > 0 ? (
            <TagBadges tags={transaction.tags ?? []} />
          ) : (
            <DetailValue className="text-muted-foreground">—</DetailValue>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Repeat className="size-4" />
          Ricorrenza
        </h3>

        {transaction.isRecurring ? (
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit">
              Ricorrente · {getRecurrenceIntervalLabel(transaction, year)}
            </Badge>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel icon={Calendar}>Inizio ricorrenza</FieldLabel>
                <DetailValue className="tabular-nums">
                  {transaction.recurrenceStart
                    ? formatDate(transaction.recurrenceStart)
                    : formatDate(transaction.date)}
                </DetailValue>
              </div>
              <div className="space-y-1">
                <FieldLabel icon={Calendar}>Fine ricorrenza</FieldLabel>
                <DetailValue className="tabular-nums">
                  {transaction.recurrenceEnd
                    ? formatDate(transaction.recurrenceEnd)
                    : "Fine anno"}
                </DetailValue>
              </div>
            </div>
          </div>
        ) : (
          <DetailValue className="text-muted-foreground">Non ricorrente</DetailValue>
        )}
      </div>
    </div>
  );
}
