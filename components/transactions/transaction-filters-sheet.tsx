"use client";

import { AccountIcon } from "@/components/accounts/account-icon";
import { CategoryIcon } from "@/components/categories/category-icon";
import { FilterMultiSelect } from "@/components/transactions/filter-multi-select";
import type { TransactionFiltersState } from "@/components/transactions/use-transaction-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  TRANSACTION_FILTER_TYPES,
  UNCATEGORIZED_CATEGORY_COLOR,
  UNCATEGORIZED_CATEGORY_ID,
} from "@/lib/constants";
import type { Account } from "@/lib/schemas/account";
import type { Category } from "@/lib/schemas/category";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

interface TransactionFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: TransactionFiltersState;
  accounts: Account[];
  categories: Category[];
  tagOptions: string[];
}

export function TransactionFiltersSheet({
  open,
  onOpenChange,
  filters,
  accounts,
  categories,
  tagOptions,
}: TransactionFiltersSheetProps) {
  const { t } = useI18n();
  const f = filters.fields;
  const selectedCountLabel = (count: number) => t("transactions.filterSelectedCount", { count });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("common.filters")}</SheetTitle>
        </SheetHeader>
        <div className="-mx-1 grid gap-4 overflow-y-auto px-1 pb-1 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="filter-from">{t("common.fromDate")}</Label>
            <Input id="filter-from" type="date" value={f.dateFrom} onChange={(e) => f.setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-to">{t("common.toDate")}</Label>
            <Input id="filter-to" type="date" value={f.dateTo} onChange={(e) => f.setDateTo(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("common.category")}</Label>
            <FilterMultiSelect
              options={[
                {
                  value: UNCATEGORIZED_CATEGORY_ID,
                  label: t("transactions.uncategorized"),
                  icon: (
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: UNCATEGORIZED_CATEGORY_COLOR }}
                    />
                  ),
                },
                ...categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                  icon: <CategoryIcon name={c.icon} color={c.color} className="size-3.5 shrink-0" />,
                })),
              ]}
              selected={f.categoryIds}
              onChange={f.setCategoryIds}
              placeholder={t("transactions.filterSelectCategories")}
              selectedLabel={selectedCountLabel}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("common.account")}</Label>
            <FilterMultiSelect
              options={accounts.map((a) => ({
                value: a.id,
                label: a.name,
                icon: <AccountIcon name={a.icon} className="size-3.5 shrink-0 text-muted-foreground" />,
              }))}
              selected={f.accountIds}
              onChange={f.setAccountIds}
              placeholder={t("transactions.filterSelectAccounts")}
              selectedLabel={selectedCountLabel}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("common.type")}</Label>
            <FilterMultiSelect
              options={TRANSACTION_FILTER_TYPES.map((txType) => ({
                value: txType,
                label: t(`labels.transactionType.${txType}`),
              }))}
              selected={f.types}
              onChange={f.setTypes}
              placeholder={t("transactions.filterSelectTypes")}
              selectedLabel={selectedCountLabel}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{t("common.tags")}</Label>
              <div role="radiogroup" aria-label={t("common.tags")} className="flex rounded-lg bg-surface-2 p-0.5 text-xs">
                {(["any", "all"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={f.tagsMatch === mode}
                    onClick={() => f.setTagsMatch(mode)}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-semibold transition-colors",
                      f.tagsMatch === mode
                        ? "bg-card text-foreground shadow-soft"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {mode === "any" ? t("transactions.filterTagsAny") : t("transactions.filterTagsAll")}
                  </button>
                ))}
              </div>
            </div>
            <FilterMultiSelect
              options={tagOptions.map((tag) => ({ value: tag, label: tag }))}
              selected={f.tags}
              onChange={f.setTags}
              placeholder={t("transactions.filterSelectTags")}
              selectedLabel={selectedCountLabel}
              emptyLabel={t("common.none")}
              searchThreshold={0}
              searchPlaceholder={t("common.searchTags")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-min">{t("transactions.filterAmountMin")}</Label>
            <Input
              id="filter-min"
              inputMode="decimal"
              placeholder={t("transactions.form.amountPlaceholder")}
              value={f.amountMinEuro}
              onChange={(e) => f.setAmountMinEuro(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-max">{t("transactions.filterAmountMax")}</Label>
            <Input
              id="filter-max"
              inputMode="decimal"
              placeholder={t("transactions.form.amountPlaceholder")}
              value={f.amountMaxEuro}
              onChange={(e) => f.setAmountMaxEuro(e.target.value)}
            />
          </div>
          {filters.amountRangeInvalid && (
            <p role="alert" className="text-xs text-danger sm:col-span-2">
              {t("transactions.filterAmountInvalidRange")}
            </p>
          )}
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={filters.clearFilters} disabled={filters.activeFilterCount === 0}>
            {t("common.clearFilters")}
          </Button>
          <Button onClick={() => onOpenChange(false)}>{t("common.showResults")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
