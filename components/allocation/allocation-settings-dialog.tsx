"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/categories/category-icon";
import { ALLOCATION_BUCKETS } from "@/components/allocation/allocation-buckets";
import { FilterMultiSelect } from "@/components/transactions/filter-multi-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "@/lib/actions/settings";
import { formatErrorMessage } from "@/lib/i18n/translate";
import type { Category } from "@/lib/schemas/category";
import {
  DEFAULT_INCOME_ALLOCATION_PERCENTS,
  type IncomeAllocationPercents,
  type Settings,
} from "@/lib/schemas/settings";
import {
  areAllocationPercentsValid,
  persistIncomeCategoryIds,
  resolveIncomeCategoryIds,
  sumAllocationPercents,
} from "@/lib/utils/income-allocation";
import { useI18n } from "@/providers/i18n-provider";

type AllocationSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  incomeCategories: Category[];
};

function parsePercentInput(raw: string): number {
  if (raw.trim() === "") return 0;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

export function AllocationSettingsDialog({
  open,
  onOpenChange,
  settings,
  incomeCategories,
}: AllocationSettingsDialogProps) {
  const { t, language } = useI18n();
  const incomeCategoryIds = useMemo(
    () => incomeCategories.map((category) => category.id),
    [incomeCategories]
  );
  const [percents, setPercents] = useState<IncomeAllocationPercents>(() => ({
    ...settings.incomeAllocation.percents,
  }));
  const [selectedIds, setSelectedIds] = useState(() =>
    resolveIncomeCategoryIds(
      settings.incomeAllocation.incomeCategoryIds,
      incomeCategoryIds
    )
  );
  const [saving, setSaving] = useState(false);

  const sum = sumAllocationPercents(percents);
  const percentsValid = areAllocationPercentsValid(percents);

  async function handleSave() {
    if (!percentsValid) return;
    setSaving(true);
    try {
      await updateSettings({
        ...settings,
        incomeAllocation: {
          percents: { ...percents },
          incomeCategoryIds: persistIncomeCategoryIds(
            selectedIds,
            incomeCategoryIds
          ),
        },
      });
      toast.success(t("allocation.saved"));
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
          <DialogTitle>{t("allocation.settingsTitle")}</DialogTitle>
          <DialogDescription>
            {t("allocation.settingsDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-3">
            {ALLOCATION_BUCKETS.map((bucket) => {
              const Icon = bucket.icon;
              return (
                <div
                  key={bucket.id}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${bucket.iconClassName}`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`alloc-${bucket.id}`}>
                      {t(bucket.titleKey)}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t(bucket.hintKey)}
                    </p>
                  </div>
                  <div className="relative w-20 shrink-0">
                    <Input
                      id={`alloc-${bucket.id}`}
                      type="number"
                      min={0}
                      max={100}
                      inputMode="numeric"
                      className="pr-7 text-right tabular-nums"
                      value={percents[bucket.id]}
                      onChange={(event) =>
                        setPercents((current) => ({
                          ...current,
                          [bucket.id]: parsePercentInput(event.target.value),
                        }))
                      }
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-2">
              <p
                className={
                  percentsValid
                    ? "text-sm text-muted-foreground"
                    : "text-sm text-destructive"
                }
              >
                {percentsValid
                  ? t("allocation.percentSum", { sum })
                  : t("allocation.percentSumError")}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setPercents({ ...DEFAULT_INCOME_ALLOCATION_PERCENTS })
                }
              >
                {t("allocation.resetDefaults")}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("allocation.incomeCategories")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("allocation.incomeCategoriesHint")}
            </p>
            <FilterMultiSelect
              options={incomeCategories.map((category) => ({
                value: category.id,
                label: category.name,
                icon: (
                  <CategoryIcon
                    name={category.icon}
                    color={category.color}
                    className="size-3.5 shrink-0"
                  />
                ),
              }))}
              selected={selectedIds}
              onChange={setSelectedIds}
              placeholder={t("allocation.allCategories")}
              selectedLabel={(count) =>
                count === incomeCategories.length
                  ? t("allocation.allCategories")
                  : t("allocation.selectedCategories", { count })
              }
              emptyLabel={t("categories.emptyIncome")}
              contentClassName="z-[80]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!percentsValid || saving}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
