"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronDown,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  Vault,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ACCUMULATION_FREQUENCIES } from "@/lib/constants";
import {
  createAccumulationPlan,
  deleteAccumulationPlan,
  pauseAccumulationPlan,
  resumeAccumulationPlan,
  updateAccumulationPlan,
} from "@/lib/actions/accumulation-plans";
import type { Account } from "@/lib/schemas/account";
import type {
  AccumulationFrequency,
  AccumulationPlan,
} from "@/lib/schemas/accumulation-plan";
import type { AccumulationContribution } from "@/lib/utils/accumulation";
import { formatErrorMessage } from "@/lib/i18n/translate";
import { centsToEuroString, toCents } from "@/lib/utils/money";
import { formatDate, todayISO } from "@/lib/utils/dates";
import { useFormatCents } from "@/hooks/use-format-cents";
import { useI18n } from "@/providers/i18n-provider";

export type PlanListItem = AccumulationPlan & {
  sourceAccountName: string;
  lifetimeBalance: number;
  yearBalance: number;
  posted: AccumulationContribution[];
  upcoming: AccumulationContribution[];
  insufficientFunds: boolean;
};

export function PlansView({
  items,
  accounts,
  year,
  currency,
  locale,
}: {
  items: PlanListItem[];
  accounts: Account[];
  year: number;
  currency: string;
  locale: string;
}) {
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlanListItem | null>(null);
  const [name, setName] = useState("");
  const [amountEuro, setAmountEuro] = useState("");
  const [frequency, setFrequency] =
    useState<AccumulationFrequency>("monthly");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [startDate, setStartDate] = useState(() => defaultStartDate(year));

  const canSubmit =
    !!name.trim() &&
    toCents(amountEuro) > 0 &&
    !!sourceAccountId &&
    !!startDate;

  function resetForm() {
    setEditing(null);
    setName("");
    setAmountEuro("");
    setFrequency("monthly");
    setSourceAccountId(accounts[0]?.id ?? "");
    setStartDate(defaultStartDate(year));
  }

  function openCreate() {
    resetForm();
    setSourceAccountId(accounts[0]?.id ?? "");
    setOpen(true);
  }

  function openEdit(item: PlanListItem) {
    setEditing(item);
    setName(item.name);
    setAmountEuro(centsToEuroString(item.amount));
    setFrequency(item.frequency);
    setSourceAccountId(item.sourceAccountId);
    setStartDate(item.startDate);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const payload = {
      name: name.trim(),
      amount: toCents(amountEuro),
      frequency,
      sourceAccountId,
      startDate,
    };
    try {
      if (editing) {
        await updateAccumulationPlan(editing.id, payload);
        toast.success(t("plans.updated"));
      } else {
        await createAccumulationPlan(payload);
        toast.success(t("plans.created"));
      }
      setOpen(false);
      resetForm();
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("plans.deleteConfirm"))) return;
    try {
      await deleteAccumulationPlan(id);
      toast.success(t("plans.deleted"));
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  async function handlePause(id: string) {
    try {
      await pauseAccumulationPlan(id);
      toast.success(t("plans.pausedToast"));
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  async function handleResume(id: string) {
    try {
      await resumeAccumulationPlan(id);
      toast.success(t("plans.resumedToast"));
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("plans.title")}
        description={t("plans.description")}
        actions={
          accounts.length > 0 ? (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              {t("plans.new")}
            </Button>
          ) : undefined
        }
      />

      {accounts.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-10 text-center">
            <p className="mb-4 text-muted-foreground">{t("plans.needAccount")}</p>
            <Button asChild>
              <Link href={`/accounts?year=${year}`}>{t("plans.goToAccounts")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
              <Vault className="size-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">{t("plans.emptyTitle")}</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {t("plans.emptyDescription")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <PlanCard
              key={item.id}
              item={item}
              year={year}
              currency={currency}
              locale={locale}
              onEdit={openEdit}
              onDelete={handleDelete}
              onPause={handlePause}
              onResume={handleResume}
            />
          ))}
        </div>
      )}

      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetForm();
        }}
      >
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {editing ? t("plans.edit") : t("plans.new")}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">{t("common.name")}</Label>
              <Input
                id="plan-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("plans.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-amount">{t("plans.amount")}</Label>
              <Input
                id="plan-amount"
                inputMode="decimal"
                value={amountEuro}
                onChange={(e) => setAmountEuro(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("plans.frequency")}</Label>
              <Select
                value={frequency}
                onValueChange={(value) =>
                  setFrequency(value as AccumulationFrequency)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCUMULATION_FREQUENCIES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`labels.accumulationFrequency.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("plans.sourceAccount")}</Label>
              <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("plans.selectAccount")} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-start">{t("plans.startDate")}</Label>
              <Input
                id="plan-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            {editing ? (
              <p className="text-xs text-muted-foreground">{t("plans.rewriteHint")}</p>
            ) : null}
            <SheetFooter>
              <Button type="submit" disabled={!canSubmit}>
                {editing ? t("common.update") : t("common.save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PlanCard({
  item,
  year,
  currency,
  locale,
  onEdit,
  onDelete,
  onPause,
  onResume,
}: {
  item: PlanListItem;
  year: number;
  currency: string;
  locale: string;
  onEdit: (item: PlanListItem) => void;
  onDelete: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}) {
  const { t, language } = useI18n();
  const formatAmount = useFormatCents();
  const paused = item.status === "paused";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{item.name}</CardTitle>
            <Badge variant={paused ? "secondary" : "default"}>
              {paused ? t("plans.paused") : t("plans.active")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatAmount(item.amount, currency, locale)} ·{" "}
            {t(`labels.accumulationFrequency.${item.frequency}`)} ·{" "}
            {item.sourceAccountName}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("plans.editAria", { name: item.name })}
            onClick={() => onEdit(item)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("plans.deleteAria", { name: item.name })}
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">{t("plans.accumulated")}</p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatAmount(item.lifetimeBalance, currency, locale)}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("plans.accumulatedYear", { year })}:{" "}
            {formatAmount(item.yearBalance, currency, locale)}
          </p>
        </div>

        {item.insufficientFunds ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t("plans.insufficientFunds")}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {paused ? (
            <Button variant="outline" size="sm" onClick={() => onResume(item.id)}>
              <Play className="size-3.5" />
              {t("plans.resume")}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => onPause(item.id)}>
              <Pause className="size-3.5" />
              {t("plans.pause")}
            </Button>
          )}
        </div>

        <ContributionList
          title={t("plans.posted")}
          items={item.posted}
          currency={currency}
          locale={locale}
          language={language}
        />
        <ContributionList
          title={t("plans.upcoming")}
          items={item.upcoming}
          currency={currency}
          locale={locale}
          language={language}
        />
      </CardContent>
    </Card>
  );
}

function ContributionList({
  title,
  items,
  currency,
  locale,
  language,
}: {
  title: string;
  items: AccumulationContribution[];
  currency: string;
  locale: string;
  language: "it" | "en";
}) {
  const { t } = useI18n();
  const formatAmount = useFormatCents();

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg py-1 text-sm font-medium hover:text-foreground">
        <span>
          {title} ({items.length})
        </span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {items.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">
            {t("plans.noneThisYear")}
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {items.map((item) => (
              <li
                key={item.occurrenceId}
                className="flex items-center justify-between py-1.5"
              >
                <span className="text-muted-foreground">
                  {formatDate(item.date, "dd/MM/yyyy", language)}
                </span>
                <span className="tabular-nums">
                  {formatAmount(item.amount, currency, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function defaultStartDate(year: number): string {
  const today = todayISO();
  return today.startsWith(String(year)) ? today : `${year}-01-01`;
}
