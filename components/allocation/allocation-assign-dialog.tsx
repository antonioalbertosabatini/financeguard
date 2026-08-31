"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ALLOCATION_BUCKET_BY_ID } from "@/components/allocation/allocation-buckets";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  saveIncomeAllocationAssignments,
  type AllocationExpenseItem,
} from "@/lib/actions/income-allocation";
import { formatErrorMessage } from "@/lib/i18n/translate";
import type {
  IncomeAllocationBucketId,
  IncomeAllocationPeriodAssignments,
} from "@/lib/schemas/settings";
import { occupancyMap } from "@/lib/utils/income-allocation";
import { formatDate } from "@/lib/utils/dates";
import { useFormatCents } from "@/hooks/use-format-cents";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

type AllocationAssignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucketId: IncomeAllocationBucketId;
  year: number;
  month: number;
  monthLabel: string;
  target: number;
  currency: string;
  expenses: AllocationExpenseItem[];
  accumulation: AllocationExpenseItem[];
  assignments: IncomeAllocationPeriodAssignments;
};

export function AllocationAssignDialog({
  open,
  onOpenChange,
  bucketId,
  year,
  month,
  monthLabel,
  target,
  currency,
  expenses,
  accumulation,
  assignments,
}: AllocationAssignDialogProps) {
  const { t, language } = useI18n();
  const formatAmount = useFormatCents();
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => assignments[bucketId]
  );
  const [saving, setSaving] = useState(false);

  const lockedByOther = useMemo(() => {
    const occupancy = occupancyMap(assignments);
    const map = new Map<string, IncomeAllocationBucketId>();
    for (const [id, owner] of occupancy) {
      if (owner !== bucketId) map.set(id, owner);
    }
    return map;
  }, [assignments, bucketId]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const spent = useMemo(() => {
    let total = 0;
    for (const item of expenses) {
      if (selectedSet.has(item.occurrenceId)) total += item.amount;
    }
    if (bucketId === "longTerm") {
      for (const item of accumulation) total += item.amount;
    }
    return total;
  }, [accumulation, bucketId, expenses, selectedSet]);

  const remaining = target - spent;
  const overspent = remaining < 0;
  const splitName = t(ALLOCATION_BUCKET_BY_ID[bucketId].titleKey);
  const showAccumulation = bucketId === "longTerm" && accumulation.length > 0;
  const isEmpty = expenses.length === 0 && !showAccumulation;

  function toggle(occurrenceId: string) {
    if (lockedByOther.has(occurrenceId)) return;
    setSelectedIds((current) =>
      current.includes(occurrenceId)
        ? current.filter((id) => id !== occurrenceId)
        : [...current, occurrenceId]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveIncomeAllocationAssignments(
        year,
        month,
        bucketId,
        selectedIds
      );
      toast.success(t("allocation.assignmentsSaved"));
      onOpenChange(false);
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("allocation.assignTitle", { split: splitName })}
          </DialogTitle>
          <DialogDescription>
            {t("allocation.assignDescription", {
              month: monthLabel,
              year,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <Metric
            label={t("allocation.target")}
            value={formatAmount(target, currency)}
          />
          <Metric
            label={t("allocation.spent")}
            value={formatAmount(spent, currency)}
          />
          <Metric
            label={
              overspent ? t("allocation.overspent") : t("allocation.remaining")
            }
            value={formatAmount(Math.abs(remaining), currency)}
            className={overspent ? "text-destructive" : "text-success"}
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
          {isEmpty ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {t("allocation.emptyExpenses")}
            </p>
          ) : (
            <ul className="divide-y">
              {showAccumulation &&
                accumulation.map((item) => (
                  <ExpenseRow
                    key={item.occurrenceId}
                    item={item}
                    checked
                    disabled
                    hint={
                      item.lockKind === "stock"
                        ? t("allocation.stockLocked")
                        : t("allocation.accumulationLocked")
                    }
                    badge={
                      item.lockKind === "stock"
                        ? t("allocation.stockBadge")
                        : t("allocation.accumulationBadge")
                    }
                    formatAmount={formatAmount}
                    currency={currency}
                    language={language}
                  />
                ))}
              {expenses.map((item) => {
                const owner = lockedByOther.get(item.occurrenceId);
                const locked = owner != null;
                return (
                  <ExpenseRow
                    key={item.occurrenceId}
                    item={item}
                    checked={selectedSet.has(item.occurrenceId)}
                    disabled={locked}
                    hint={
                      owner
                        ? t("allocation.assignedTo", {
                            split: t(ALLOCATION_BUCKET_BY_ID[owner].titleKey),
                          })
                        : undefined
                    }
                    formatAmount={formatAmount}
                    currency={currency}
                    language={language}
                    onToggle={() => toggle(item.occurrenceId)}
                  />
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-sm font-medium tabular-nums", className)}>
        {value}
      </p>
    </div>
  );
}

function ExpenseRow({
  item,
  checked,
  disabled,
  hint,
  badge,
  formatAmount,
  currency,
  language,
  onToggle,
}: {
  item: AllocationExpenseItem;
  checked: boolean;
  disabled: boolean;
  hint?: string;
  badge?: string;
  formatAmount: (cents: number, currency?: string) => string;
  currency: string;
  language: "it" | "en";
  onToggle?: () => void;
}) {
  return (
    <li>
      <div
        className={cn(
          "flex items-start gap-3 px-3 py-2.5",
          disabled ? "opacity-70" : "cursor-pointer hover:bg-muted/40"
        )}
        onClick={() => {
          if (!disabled) onToggle?.();
        }}
      >
        <Checkbox
          checked={checked}
          disabled={disabled}
          className="mt-0.5"
          onClick={(event) => event.stopPropagation()}
          onCheckedChange={() => {
            if (!disabled) onToggle?.();
          }}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <CategoryIcon
              name={item.categoryIcon}
              color={item.categoryColor}
              className="size-3.5 shrink-0"
            />
            <span className="truncate text-sm font-medium">
              {item.planName ?? item.categoryName}
            </span>
            {badge && (
              <Badge variant="secondary" className="shrink-0">
                {badge}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatDate(item.date, "dd/MM/yyyy", language)}
            {item.notes && !item.isAccumulation ? ` · ${item.notes}` : null}
          </p>
          {hint && (
            <p className="text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        <p className="shrink-0 text-sm font-medium tabular-nums">
          {formatAmount(item.amount, currency)}
        </p>
      </div>
    </li>
  );
}
