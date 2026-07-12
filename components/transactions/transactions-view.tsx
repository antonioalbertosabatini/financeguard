"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Filter, Pencil, Plus, Trash2, X } from "lucide-react";
import { AccountIcon } from "@/components/accounts/account-icon";
import { CategoryIcon } from "@/components/categories/category-icon";
import { CategorySelectItem } from "@/components/categories/category-select-item";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { formatSignedCents } from "@/lib/utils/money";
import {
  getOccurrenceMonthLabel,
  getRecurrenceIntervalLabel,
} from "@/lib/utils/recurrence";
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

function matchesFilters(
  tx: Pick<Transaction, "date" | "categoryId" | "accountId" | "type">,
  filters: {
    dateFrom: string;
    dateTo: string;
    categoryId: string;
    accountId: string;
    type: string;
  }
): boolean {
  if (filters.dateFrom && tx.date < filters.dateFrom) return false;
  if (filters.dateTo && tx.date > filters.dateTo) return false;
  if (filters.categoryId !== "all" && tx.categoryId !== filters.categoryId) {
    return false;
  }
  if (filters.accountId !== "all" && tx.accountId !== filters.accountId) {
    return false;
  }
  if (filters.type !== "all" && tx.type !== filters.type) return false;
  return true;
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
  const [categoryId, setCategoryId] = useState<string>("all");
  const [accountId, setAccountId] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [sheetState, setSheetState] = useState<TransactionSheetState | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const monthLabelsFull = useMemo(() => getMonthLabelsFull(language), [language]);

  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts]
  );
  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const filterState = useMemo(
    () => ({ dateFrom, dateTo, categoryId, accountId, type }),
    [dateFrom, dateTo, categoryId, accountId, type]
  );

  const filtered = useMemo(() => {
    return transactions.filter((tx) => matchesFilters(tx, filterState));
  }, [transactions, filterState]);

  const filteredOccurrences = useMemo(() => {
    return occurrences.filter((tx) => matchesFilters(tx, filterState));
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

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filtered) {
      if (tx.type === "income") income += tx.amount;
      if (tx.type === "expense") expense += tx.amount;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const groupedByMonth = useMemo(() => {
    const rows: ListRow[] = [
      ...filtered.map((tx) => ({ kind: "rule" as const, tx })),
      ...displayOccurrences.map((tx) => ({ kind: "occurrence" as const, tx })),
    ];

    const map = new Map<string, ListRow[]>();
    for (const row of rows) {
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
  }, [filtered, displayOccurrences, monthLabelsFull]);

  const hasDisplayRows = groupedByMonth.length > 0;

  const activeFilterCount =
    (dateFrom !== "" ? 1 : 0) +
    (dateTo !== "" ? 1 : 0) +
    (categoryId !== "all" ? 1 : 0) +
    (accountId !== "all" ? 1 : 0) +
    (type !== "all" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setCategoryId("all");
    setAccountId("all");
    setType("all");
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

  const filterFields = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("common.fromDate")}</Label>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("common.toDate")}</Label>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("common.category")}</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.allFeminine")}</SelectItem>
            {categories.map((c) => (
              <CategorySelectItem key={c.id} category={c} />
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("common.account")}</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <span className="flex items-center gap-2">
                  <AccountIcon
                    name={a.icon}
                    className="size-3.5 text-muted-foreground"
                  />
                  {a.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("common.type")}</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {TRANSACTION_FILTER_TYPES.map((txType) => (
              <SelectItem key={txType} value={txType}>
                {t(`labels.transactionType.${txType}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const activeChips = hasActiveFilters && (
    <div className="flex flex-wrap items-center gap-2">
      {dateFrom && (
        <Badge variant="secondary" className="cursor-pointer gap-1 pr-1.5" onClick={() => setDateFrom("")}>
          {t("transactions.filterChipFrom", { date: formatDate(dateFrom) })}
          <X className="size-3" />
        </Badge>
      )}
      {dateTo && (
        <Badge variant="secondary" className="cursor-pointer gap-1 pr-1.5" onClick={() => setDateTo("")}>
          {t("transactions.filterChipTo", { date: formatDate(dateTo) })}
          <X className="size-3" />
        </Badge>
      )}
      {categoryId !== "all" && (
        <Badge variant="secondary" className="cursor-pointer gap-1 pr-1.5" onClick={() => setCategoryId("all")}>
          {t("transactions.filterChipCategory", { name: categoryMap[categoryId]?.name ?? categoryId })}
          <X className="size-3" />
        </Badge>
      )}
      {accountId !== "all" && (
        <Badge variant="secondary" className="cursor-pointer gap-1 pr-1.5" onClick={() => setAccountId("all")}>
          {t("transactions.filterChipAccount", { name: accountMap[accountId]?.name ?? accountId })}
          <X className="size-3" />
        </Badge>
      )}
      {type !== "all" && (
        <Badge variant="secondary" className="cursor-pointer gap-1 pr-1.5" onClick={() => setType("all")}>
          {t("transactions.filterChipType", {
            type: t(`labels.transactionType.${type as Transaction["type"]}`),
          })}
          <X className="size-3" />
        </Badge>
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
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{filtered.length}</span>{" "}
                {filtered.length === 1
                  ? t("transactions.countSingular")
                  : t("transactions.countPlural")}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular-nums">
                <span className="text-success">
                  {formatSignedCents(totals.income, "income", currency, locale, amountsHidden)}
                </span>
                <span className="text-danger">
                  {formatSignedCents(totals.expense, "expense", currency, locale, amountsHidden)}
                </span>
                <span className="font-medium">
                  {t("transactions.balance", {
                    amount: formatCentsDisplay(totals.net, currency, locale),
                  })}
                </span>
              </div>
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
                availableTags={availableTags}
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
