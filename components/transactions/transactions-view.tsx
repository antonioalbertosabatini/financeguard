"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  Copy,
  Filter,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AccountIcon } from "@/components/accounts/account-icon";
import { CategoryIcon } from "@/components/categories/category-icon";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FilterMultiSelect } from "@/components/transactions/filter-multi-select";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionDetailView } from "@/components/transactions/transaction-detail-view";
import { TagBadges } from "@/components/tags/tag-badges";
import {
  copyRecurringFromPreviousYear,
  deleteTransaction,
} from "@/lib/actions/transactions";
import { TRANSACTION_FILTER_TYPES } from "@/lib/constants";
import type { Account } from "@/lib/schemas/account";
import type { Category } from "@/lib/schemas/category";
import type { ExpandedTransaction, Transaction } from "@/lib/schemas/transaction";
import { useAmountVisibility } from "@/providers/amount-visibility-provider";
import { useI18n } from "@/providers/i18n-provider";
import { useFormatCents } from "@/hooks/use-format-cents";
import { formatErrorMessage, getMonthLabelsFull } from "@/lib/i18n/translate";
import { formatDate } from "@/lib/utils/dates";
import { formatCents, formatSignedCents, toCents } from "@/lib/utils/money";
import {
  getOccurrenceMonthLabel,
  getRecurrenceIntervalLabel,
} from "@/lib/utils/recurrence";
import {
  countActiveUiFilters,
  EMPTY_UI_FILTERS,
  matchesUiFilters,
  summarizeByMonth,
  summarizeTransactions,
  type MatchMode,
  type UiTransactionFilters,
} from "@/lib/utils/transaction-filters";
import {
  collectTagsFromTransactions,
  mergeTagLists,
} from "@/lib/utils/tags";
import { cn } from "@/lib/utils";

type ListRow =
  | { kind: "rule"; tx: Transaction }
  | { kind: "occurrence"; tx: ExpandedTransaction };

type TransactionSheetState = {
  transaction: Transaction;
  mode: "view" | "edit";
  listContext?: { kind: "rule" | "occurrence"; displayDate: string };
};

type TransactionsViewProps = {
  transactions: Transaction[];
  occurrences: ExpandedTransaction[];
  accounts: Account[];
  categories: Category[];
  availableTags: string[];
  year: number;
  currency: string;
  locale: string;
};

const TYPE_BADGE_CLASS: Record<Transaction["type"], string> = {
  income: "bg-success/10 text-success hover:bg-success/10",
  expense: "bg-danger/10 text-danger hover:bg-danger/10",
  transfer: "bg-muted text-muted-foreground hover:bg-muted",
};

const TYPE_BORDER_CLASS: Record<Transaction["type"], string> = {
  income: "border-l-success",
  expense: "border-l-danger",
  transfer: "border-l-muted-foreground/30",
};

const TYPE_DOT_CLASS: Record<Transaction["type"], string> = {
  income: "bg-success",
  expense: "bg-danger",
  transfer: "bg-muted-foreground/40",
};

function resolveSourceTransaction(
  row: ListRow,
  transactions: Transaction[]
): Transaction {
  if (row.kind === "rule") return row.tx;
  return (
    transactions.find((t) => t.id === row.tx.sourceTransactionId) ?? row.tx
  );
}

function listRowKey(row: ListRow): string {
  return row.kind === "rule" ? row.tx.id : row.tx.occurrenceId;
}

function euroFilterToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const cents = toCents(trimmed);
  return cents > 0 ? cents : null;
}

export function TransactionsView({
  transactions,
  occurrences,
  accounts,
  categories,
  availableTags,
  year,
  currency,
  locale,
}: TransactionsViewProps) {
  const { t, language } = useI18n();
  const formatCentsDisplay = useFormatCents();
  const { amountsHidden } = useAmountVisibility();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagsMatch, setTagsMatch] = useState<MatchMode>("any");
  const [amountMinEuro, setAmountMinEuro] = useState("");
  const [amountMaxEuro, setAmountMaxEuro] = useState("");
  const [sheetState, setSheetState] = useState<TransactionSheetState | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);

  const monthLabelsFull = useMemo(() => getMonthLabelsFull(language), [language]);

  const filterTags = useMemo(
    () => collectTagsFromTransactions(transactions, locale),
    [transactions, locale]
  );

  const formTags = useMemo(
    () => mergeTagLists([availableTags, filterTags], locale),
    [availableTags, filterTags, locale]
  );

  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts]
  );
  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const filterState = useMemo((): UiTransactionFilters => {
    return {
      dateFrom,
      dateTo,
      categoryIds,
      accountIds,
      types,
      tags,
      tagsMatch,
      amountMinCents: euroFilterToCents(amountMinEuro),
      amountMaxCents: euroFilterToCents(amountMaxEuro),
    };
  }, [
    dateFrom,
    dateTo,
    categoryIds,
    accountIds,
    types,
    tags,
    tagsMatch,
    amountMinEuro,
    amountMaxEuro,
  ]);

  const amountRangeInvalid =
    filterState.amountMinCents !== null &&
    filterState.amountMaxCents !== null &&
    filterState.amountMinCents > filterState.amountMaxCents;

  const filtered = useMemo(() => {
    return transactions.filter((tx) => matchesUiFilters(tx, filterState));
  }, [transactions, filterState]);

  const filteredOccurrences = useMemo(() => {
    return occurrences.filter((tx) => matchesUiFilters(tx, filterState));
  }, [occurrences, filterState]);

  const ruleAnchorMonthById = useMemo(() => {
    const map = new Map<string, string>();
    for (const tx of transactions) {
      if (tx.isRecurring) {
        map.set(tx.id, tx.date.slice(0, 7));
      }
    }
    return map;
  }, [transactions]);

  const displayOccurrences = useMemo(() => {
    return filteredOccurrences.filter((tx) => {
      const anchorMonth = ruleAnchorMonthById.get(tx.sourceTransactionId);
      if (!anchorMonth) return true;
      return tx.date.slice(0, 7) !== anchorMonth;
    });
  }, [filteredOccurrences, ruleAnchorMonthById]);

  const displayRows = useMemo((): ListRow[] => {
    return [
      ...filtered.map((tx) => ({ kind: "rule" as const, tx })),
      ...displayOccurrences.map((tx) => ({ kind: "occurrence" as const, tx })),
    ];
  }, [filtered, displayOccurrences]);

  const totals = useMemo(
    () => summarizeTransactions(displayRows.map((row) => row.tx)),
    [displayRows]
  );

  const monthlySummaries = useMemo(
    () => summarizeByMonth(displayRows.map((row) => row.tx)),
    [displayRows]
  );

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, ListRow[]>();
    for (const row of displayRows) {
      const key = row.tx.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }

    const groups: { monthKey: string; label: string; items: ListRow[] }[] = [];
    for (const [monthKey, items] of map) {
      items.sort((a, b) => b.tx.date.localeCompare(a.tx.date));
      const month = parseInt(monthKey.slice(5, 7), 10);
      groups.push({
        monthKey,
        label: `${monthLabelsFull[month - 1]} ${monthKey.slice(0, 4)}`,
        items,
      });
    }

    groups.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    return groups;
  }, [displayRows, monthLabelsFull]);

  const hasDisplayRows = groupedByMonth.length > 0;

  const activeFilterCount = countActiveUiFilters(filterState);
  const hasActiveFilters = activeFilterCount > 0;

  function clearFilters() {
    setDateFrom(EMPTY_UI_FILTERS.dateFrom);
    setDateTo(EMPTY_UI_FILTERS.dateTo);
    setCategoryIds([]);
    setAccountIds([]);
    setTypes([]);
    setTags([]);
    setTagsMatch("any");
    setAmountMinEuro("");
    setAmountMaxEuro("");
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteTransaction(deleting.id, year);
      toast.success(t("transactions.deleted"));
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    } finally {
      setDeleting(null);
    }
  }

  async function handleCopyRecurring() {
    try {
      const count = await copyRecurringFromPreviousYear(year);
      toast.success(
        count > 0
          ? t("transactions.copySuccess", { count, year: year - 1 })
          : t("transactions.copyEmpty")
      );
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  function formatAmount(tx: Transaction) {
    return formatSignedCents(
      tx.amount,
      tx.type,
      currency,
      locale,
      amountsHidden
    );
  }

  function monthLabel(monthKey: string) {
    const month = parseInt(monthKey.slice(5, 7), 10);
    return `${monthLabelsFull[month - 1]} ${monthKey.slice(0, 4)}`;
  }

  const selectedCountLabel = (count: number) =>
    t("transactions.filterSelectedCount", { count });

  const filterFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("common.fromDate")}</Label>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("common.toDate")}</Label>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs text-muted-foreground">{t("common.category")}</Label>
        <FilterMultiSelect
          options={categories.map((c) => ({
            value: c.id,
            label: c.name,
            icon: (
              <CategoryIcon
                name={c.icon}
                color={c.color}
                className="size-3.5 shrink-0"
              />
            ),
          }))}
          selected={categoryIds}
          onChange={setCategoryIds}
          placeholder={t("transactions.filterSelectCategories")}
          selectedLabel={selectedCountLabel}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs text-muted-foreground">{t("common.account")}</Label>
        <FilterMultiSelect
          options={accounts.map((a) => ({
            value: a.id,
            label: a.name,
            icon: (
              <AccountIcon
                name={a.icon}
                className="size-3.5 shrink-0 text-muted-foreground"
              />
            ),
          }))}
          selected={accountIds}
          onChange={setAccountIds}
          placeholder={t("transactions.filterSelectAccounts")}
          selectedLabel={selectedCountLabel}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs text-muted-foreground">{t("common.type")}</Label>
        <FilterMultiSelect
          options={TRANSACTION_FILTER_TYPES.map((txType) => ({
            value: txType,
            label: t(`labels.transactionType.${txType}`),
          }))}
          selected={types}
          onChange={setTypes}
          placeholder={t("transactions.filterSelectTypes")}
          selectedLabel={selectedCountLabel}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">{t("common.tags")}</Label>
          <div className="flex rounded-md border p-0.5 text-xs">
            <button
              type="button"
              className={cn(
                "rounded px-2 py-0.5 transition-colors",
                tagsMatch === "any"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTagsMatch("any")}
            >
              {t("transactions.filterTagsAny")}
            </button>
            <button
              type="button"
              className={cn(
                "rounded px-2 py-0.5 transition-colors",
                tagsMatch === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTagsMatch("all")}
            >
              {t("transactions.filterTagsAll")}
            </button>
          </div>
        </div>
        <FilterMultiSelect
          options={filterTags.map((tag) => ({ value: tag, label: tag }))}
          selected={tags}
          onChange={setTags}
          placeholder={t("transactions.filterSelectTags")}
          selectedLabel={selectedCountLabel}
          emptyLabel={t("common.none")}
          searchThreshold={0}
          searchPlaceholder={t("common.searchTags")}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          {t("transactions.filterAmountMin")}
        </Label>
        <Input
          inputMode="decimal"
          placeholder={t("transactions.form.amountPlaceholder")}
          value={amountMinEuro}
          onChange={(e) => setAmountMinEuro(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          {t("transactions.filterAmountMax")}
        </Label>
        <Input
          inputMode="decimal"
          placeholder={t("transactions.form.amountPlaceholder")}
          value={amountMaxEuro}
          onChange={(e) => setAmountMaxEuro(e.target.value)}
        />
      </div>
      {amountRangeInvalid && (
        <p className="text-xs text-danger sm:col-span-2">
          {t("transactions.filterAmountInvalidRange")}
        </p>
      )}
    </div>
  );

  const activeChips = hasActiveFilters && (
    <div className="flex flex-wrap items-center gap-2">
      {dateFrom && (
        <Badge
          variant="secondary"
          className="cursor-pointer gap-1 pr-1.5"
          onClick={() => setDateFrom("")}
        >
          {t("transactions.filterChipFrom", { date: formatDate(dateFrom) })}
          <X className="size-3" />
        </Badge>
      )}
      {dateTo && (
        <Badge
          variant="secondary"
          className="cursor-pointer gap-1 pr-1.5"
          onClick={() => setDateTo("")}
        >
          {t("transactions.filterChipTo", { date: formatDate(dateTo) })}
          <X className="size-3" />
        </Badge>
      )}
      {categoryIds.map((id) => (
        <Badge
          key={`cat-${id}`}
          variant="secondary"
          className="cursor-pointer gap-1 pr-1.5"
          onClick={() => setCategoryIds((prev) => prev.filter((x) => x !== id))}
        >
          {t("transactions.filterChipCategory", {
            name: categoryMap[id]?.name ?? id,
          })}
          <X className="size-3" />
        </Badge>
      ))}
      {accountIds.map((id) => (
        <Badge
          key={`acc-${id}`}
          variant="secondary"
          className="cursor-pointer gap-1 pr-1.5"
          onClick={() => setAccountIds((prev) => prev.filter((x) => x !== id))}
        >
          {t("transactions.filterChipAccount", {
            name: accountMap[id]?.name ?? id,
          })}
          <X className="size-3" />
        </Badge>
      ))}
      {types.map((txType) => (
        <Badge
          key={`type-${txType}`}
          variant="secondary"
          className="cursor-pointer gap-1 pr-1.5"
          onClick={() => setTypes((prev) => prev.filter((x) => x !== txType))}
        >
          {t("transactions.filterChipType", {
            type: t(`labels.transactionType.${txType as Transaction["type"]}`),
          })}
          <X className="size-3" />
        </Badge>
      ))}
      {tags.map((tag) => (
        <Badge
          key={`tag-${tag}`}
          variant="secondary"
          className="cursor-pointer gap-1 pr-1.5"
          onClick={() => setTags((prev) => prev.filter((x) => x !== tag))}
        >
          {t("transactions.filterChipTag", { tag })}
          <X className="size-3" />
        </Badge>
      ))}
      {tags.length > 0 && tagsMatch === "all" && (
        <Badge
          variant="secondary"
          className="cursor-pointer gap-1 pr-1.5"
          onClick={() => setTagsMatch("any")}
        >
          {t("transactions.filterChipTagsAll")}
          <X className="size-3" />
        </Badge>
      )}
      {filterState.amountMinCents !== null && filterState.amountMaxCents !== null ? (
        <Badge
          variant="secondary"
          className="cursor-pointer gap-1 pr-1.5"
          onClick={() => {
            setAmountMinEuro("");
            setAmountMaxEuro("");
          }}
        >
          {t("transactions.filterChipAmountRange", {
            min: formatCents(filterState.amountMinCents, currency, locale),
            max: formatCents(filterState.amountMaxCents, currency, locale),
          })}
          <X className="size-3" />
        </Badge>
      ) : (
        <>
          {filterState.amountMinCents !== null && (
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1 pr-1.5"
              onClick={() => setAmountMinEuro("")}
            >
              {t("transactions.filterChipAmountMin", {
                amount: formatCents(filterState.amountMinCents, currency, locale),
              })}
              <X className="size-3" />
            </Badge>
          )}
          {filterState.amountMaxCents !== null && (
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1 pr-1.5"
              onClick={() => setAmountMaxEuro("")}
            >
              {t("transactions.filterChipAmountMax", {
                amount: formatCents(filterState.amountMaxCents, currency, locale),
              })}
              <X className="size-3" />
            </Badge>
          )}
        </>
      )}
      <Button variant="ghost" size="sm" onClick={clearFilters}>
        {t("common.clearFilters")}
      </Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("transactions.title")}
        description={t("transactions.description", { year })}
        actions={
          <>
            <Button variant="outline" className="hidden sm:inline-flex" asChild>
              <Link href="/add">
                <Plus className="size-4" />
                {t("transactions.new")}
              </Link>
            </Button>
            <Button variant="outline" onClick={handleCopyRecurring}>
              <Copy className="size-4" />
              <span className="hidden sm:inline">
                {t("transactions.copyRecurring", { year: year - 1 })}
              </span>
              <span className="sm:hidden">
                {t("transactions.copyRecurringShort", { year: year - 1 })}
              </span>
            </Button>
          </>
        }
      />

      {/* Filters control bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setFiltersOpen(true)}
          className="gap-2"
        >
          <Filter className="size-4" />
          {t("common.filters")}
          {activeFilterCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            {t("common.reset")}
          </Button>
        )}
        <div className="hidden flex-1 sm:block">{activeChips}</div>
      </div>
      <div className="sm:hidden">{activeChips}</div>

      {!hasDisplayRows ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>
              {transactions.length === 0 && occurrences.length === 0
                ? t("transactions.emptyYear")
                : t("transactions.emptyFiltered")}
            </p>
            <Button variant="link" asChild className="mt-2">
              <Link href="/add">{t("transactions.addOne")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <Card>
            <CardContent className="space-y-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{totals.count}</span>{" "}
                  {totals.count === 1
                    ? t("transactions.countSingular")
                    : t("transactions.countPlural")}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular-nums">
                  <span className="text-success">
                    {formatSignedCents(
                      totals.income,
                      "income",
                      currency,
                      locale,
                      amountsHidden
                    )}
                  </span>
                  <span className="text-danger">
                    {formatSignedCents(
                      totals.expense,
                      "expense",
                      currency,
                      locale,
                      amountsHidden
                    )}
                  </span>
                  <span className="font-medium">
                    {t("transactions.balance", {
                      amount: formatCentsDisplay(totals.net, currency, locale),
                    })}
                  </span>
                </div>
              </div>

              {monthlySummaries.length > 0 && (
                <Collapsible open={monthlyOpen} onOpenChange={setMonthlyOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-md py-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span>
                        <span className="font-medium text-foreground">
                          {t("transactions.monthlyBreakdown")}
                        </span>
                        <span className="ml-2 text-xs">
                          {t("transactions.monthlyBreakdownHint")}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 transition-transform",
                          monthlyOpen && "rotate-180"
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="mt-2 divide-y border-t">
                      {monthlySummaries.map((month) => (
                        <li
                          key={month.monthKey}
                          className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                        >
                          <span className="font-medium">
                            {monthLabel(month.monthKey)}
                          </span>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
                            <span className="text-success">
                              {formatSignedCents(
                                month.income,
                                "income",
                                currency,
                                locale,
                                amountsHidden
                              )}
                            </span>
                            <span className="text-danger">
                              {formatSignedCents(
                                month.expense,
                                "expense",
                                currency,
                                locale,
                                amountsHidden
                              )}
                            </span>
                            <span className="text-muted-foreground">
                              {formatCentsDisplay(month.net, currency, locale)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>

          {/* Mobile: grouped card list */}
          <div className="space-y-5 md:hidden">
            {groupedByMonth.map((group) => (
              <div key={group.monthKey} className="space-y-2">
                <div className="flex items-baseline justify-between px-1">
                  <h3 className="text-sm font-semibold">{group.label}</h3>
                  <span className="text-xs text-muted-foreground">
                    {group.items.length}{" "}
                    {group.items.length === 1
                      ? t("transactions.countSingular")
                      : t("transactions.countPlural")}
                  </span>
                </div>
                <Card className="divide-y divide-border/70 py-0">
                  {group.items.map((row) => {
                    const tx = row.tx;
                    const source = resolveSourceTransaction(row, transactions);
                    const category = tx.categoryId ? categoryMap[tx.categoryId] : undefined;
                    const account = accountMap[tx.accountId];
                    return (
                      <button
                        key={listRowKey(row)}
                        type="button"
                        onClick={() =>
                          setSheetState({
                            transaction: source,
                            mode: "view",
                            listContext: { kind: row.kind, displayDate: tx.date },
                          })
                        }
                        className={cn(
                          "flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left transition-colors active:bg-muted/60",
                          TYPE_BORDER_CLASS[tx.type]
                        )}
                      >
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor: category
                              ? `${category.color}1a`
                              : "var(--muted)",
                          }}
                        >
                          {category ? (
                            <CategoryIcon
                              name={category.icon}
                              color={category.color}
                              className="size-4"
                            />
                          ) : (
                            <span className={cn("size-2 rounded-full", TYPE_DOT_CLASS[tx.type])} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">
                              {category?.name ?? t(`labels.transactionType.${tx.type}`)}
                            </span>
                            {row.kind === "rule" && tx.isRecurring && (
                              <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">
                                {t("transactions.recurring", {
                                  interval: getRecurrenceIntervalLabel(tx, year, language),
                                })}
                              </Badge>
                            )}
                            {row.kind === "occurrence" && (
                              <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">
                                {t("transactions.occurrence", {
                                  label: getOccurrenceMonthLabel(tx.date, year, language),
                                })}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="tabular-nums">{formatDate(tx.date)}</span>
                            {account && (
                              <>
                                <span>·</span>
                                <AccountIcon name={account.icon} className="size-3" />
                                <span className="truncate">{account.name}</span>
                              </>
                            )}
                          </div>
                          {(tx.tags?.length ?? 0) > 0 && (
                            <div className="mt-1.5">
                              <TagBadges tags={tx.tags ?? []} />
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              tx.type === "income" && "text-success",
                              tx.type === "expense" && "text-danger"
                            )}
                          >
                            {formatAmount(tx)}
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label={t("common.delete")}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleting(source);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeleting(source);
                              }
                            }}
                            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
                          >
                            <Trash2 className="size-3.5" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </Card>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.type")}</TableHead>
                  <TableHead>{t("common.category")}</TableHead>
                  <TableHead>{t("common.account")}</TableHead>
                  <TableHead className="text-right">{t("common.amount")}</TableHead>
                  <TableHead>{t("common.tags")}</TableHead>
                  <TableHead>{t("common.notes")}</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedByMonth.map((group) => (
                  <Fragment key={group.monthKey}>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={8} className="sticky top-0 py-2 font-medium">
                        {group.label}
                        <span className="ml-2 font-normal text-muted-foreground">
                          — {group.items.length}{" "}
                          {group.items.length === 1
                            ? t("transactions.countSingular")
                            : t("transactions.countPlural")}
                        </span>
                      </TableCell>
                    </TableRow>
                    {group.items.map((row) => {
                      const tx = row.tx;
                      const source = resolveSourceTransaction(row, transactions);
                      const category = tx.categoryId ? categoryMap[tx.categoryId] : undefined;
                      return (
                        <TableRow
                          key={listRowKey(row)}
                          className={cn("border-l-2 hover:bg-muted/50", TYPE_BORDER_CLASS[tx.type])}
                        >
                          <TableCell className="tabular-nums">{formatDate(tx.date)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="secondary" className={cn("w-fit", TYPE_BADGE_CLASS[tx.type])}>
                                {t(`labels.transactionType.${tx.type}`)}
                              </Badge>
                              {row.kind === "rule" && tx.isRecurring && (
                                <Badge variant="outline" className="w-fit text-xs">
                                  {t("transactions.recurring", {
                                    interval: getRecurrenceIntervalLabel(tx, year, language),
                                  })}
                                </Badge>
                              )}
                              {row.kind === "occurrence" && (
                                <Badge variant="outline" className="w-fit text-xs">
                                  {t("transactions.occurrence", {
                                    label: getOccurrenceMonthLabel(tx.date, year, language),
                                  })}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {category ? (
                              <span className="flex items-center gap-2">
                                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                                <CategoryIcon name={category.icon} color={category.color} className="size-3.5" />
                                <span className="truncate">{category.name}</span>
                              </span>
                            ) : (
                              t("common.none")
                            )}
                          </TableCell>
                          <TableCell>
                            {accountMap[tx.accountId] ? (
                              <span className="flex items-center gap-2">
                                <AccountIcon name={accountMap[tx.accountId]!.icon} className="size-3.5 text-muted-foreground" />
                                {accountMap[tx.accountId]!.name}
                              </span>
                            ) : (
                              t("common.none")
                            )}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-medium tabular-nums",
                              tx.type === "income" && "text-success",
                              tx.type === "expense" && "text-danger"
                            )}
                          >
                            {formatAmount(tx)}
                          </TableCell>
                          <TableCell>
                            <TagBadges tags={tx.tags ?? []} />
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {tx.notes || t("common.none")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                  setSheetState({ transaction: source, mode: "edit" })
                                }
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(source)}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Filters sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t("common.filters")}</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto">{filterFields}</div>
          <SheetFooter>
            <Button variant="ghost" onClick={clearFilters} disabled={!hasActiveFilters}>
              {t("common.clearFilters")}
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>{t("common.showResults")}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Transaction sheet (view on mobile tap, edit on desktop pencil) */}
      <Sheet open={!!sheetState} onOpenChange={(open) => !open && setSheetState(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {sheetState?.mode === "view"
                ? t("transactions.detailTitle")
                : t("transactions.editTitle")}
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto">
            {sheetState?.mode === "view" && (
              <TransactionDetailView
                transaction={sheetState.transaction}
                accounts={accounts}
                categories={categories}
                year={year}
                currency={currency}
                locale={locale}
                listContext={sheetState.listContext}
              />
            )}
            {sheetState?.mode === "edit" && (
              <TransactionForm
                key={sheetState.transaction.id}
                accounts={accounts}
                categories={categories}
                availableTags={formTags}
                year={year}
                transaction={sheetState.transaction}
                onSuccess={() => setSheetState(null)}
                onCancel={
                  sheetState.listContext
                    ? () => setSheetState((s) => s && { ...s, mode: "view" })
                    : undefined
                }
                confirmLabel={sheetState.listContext ? t("common.confirm") : undefined}
                compact
              />
            )}
          </div>
          {sheetState?.mode === "view" && (
            <SheetFooter>
              <Button
                className="w-full"
                onClick={() => setSheetState((s) => s && { ...s, mode: "edit" })}
              >
                {t("common.edit")}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("transactions.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("common.cannotUndo")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
