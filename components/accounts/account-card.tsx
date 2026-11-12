"use client";

import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { AccountIcon } from "@/components/accounts/account-icon";
import { Amount } from "@/components/common/amount";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Account } from "@/lib/schemas/account";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

/** Each account type gets a semantic tone (no hard-coded palette colours). */
export const ACCOUNT_TYPE_TONE: Record<Account["type"], string> = {
  checking: "bg-primary-soft text-primary-soft-foreground",
  cash: "bg-success-soft text-success",
  savings: "bg-info-soft text-info",
  credit_card: "bg-warning-soft text-warning",
};

export const ACCOUNT_TYPE_DOT: Record<Account["type"], string> = {
  checking: "bg-primary",
  cash: "bg-success",
  savings: "bg-info",
  credit_card: "bg-warning",
};

interface AccountCardProps {
  account: Account & { balance: number };
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}

export function AccountCard({ account, isFirst, isLast, onEdit, onDelete, onMove }: AccountCardProps) {
  const { t } = useI18n();
  return (
    <article className="flex flex-col justify-between gap-5 rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", ACCOUNT_TYPE_TONE[account.type])}
            aria-hidden="true"
          >
            <AccountIcon name={account.icon} className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[0.9375rem] font-semibold">{account.name}</h3>
            <p className="text-[0.8125rem] text-muted-foreground">{t(`labels.accountType.${account.type}`)}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("accounts.accountActions", { name: account.name })}
              className="-mt-1 -mr-1.5 text-muted-foreground"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              {t("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onMove(-1)} disabled={isFirst}>
              <ArrowUp />
              {t("accounts.moveUp")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onMove(1)} disabled={isLast}>
              <ArrowDown />
              {t("accounts.moveDown")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 />
              {t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-[1.75rem] leading-none font-bold tracking-[-0.02em]">
        <Amount
          cents={account.balance}
          currency={account.currency}
          className={account.balance < 0 ? "text-danger" : undefined}
        />
      </p>
    </article>
  );
}
