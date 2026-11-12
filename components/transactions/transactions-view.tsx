"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftRight, Copy, FileUp, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { FilterChip } from "@/components/common/filter-chip";
import { PageHeader } from "@/components/layout/page-header";
import { Amount } from "@/components/common/amount";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConvertToTransferDialog } from "@/components/transactions/convert-to-transfer-dialog";
import { ImportDialog } from "@/components/transactions/import-dialog";
import { isUncategorized } from "@/components/transactions/uncategorized-badge";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionDetailView } from "@/components/transactions/transaction-detail-view";
import { TransactionFiltersSheet } from "@/components/transactions/transaction-filters-sheet";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { TransactionsSummary } from "@/components/transactions/transactions-summary";
import { useTransactionFilters } from "@/components/transactions/use-transaction-filters";
import { copyRecurringFromPreviousYear, deleteTransaction } from "@/lib/actions/transactions";
import { UNCATEGORIZED_CATEGORY_COLOR, UNCATEGORIZED_CATEGORY_ID } from "@/lib/constants";
import type { Account } from "@/lib/schemas/account";
import type { Category } from "@/lib/schemas/category";
import type { ExpandedTransaction, Transaction } from "@/lib/schemas/transaction";
import { formatErrorMessage } from "@/lib/i18n/translate";
import { matchesUiFilters, summarizeByMonth, summarizeTransactions } from "@/lib/utils/transaction-filters";
import { collectTagsFromTransactions, mergeTagLists } from "@/lib/utils/tags";
import { isConvertibleToTransfer } from "@/lib/utils/transfer-conversion";
import { relativeDayLabel } from "@/lib/utils/relative-day";
import { useYearHref } from "@/hooks/use-year-href";
import { useConfirm } from "@/providers/confirm-provider";
import { useI18n } from "@/providers/i18n-provider";

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

/** Days rendered with the entrance animation (keeps long lists cheap). */
const ANIMATED_DAY_GROUPS = 6;

function rowKey(row: ListRow): string {
  return row.kind === "rule" ? row.tx.id : row.tx.occurrenceId;
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
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const withYear = useYearHref();

  const filters = useTransactionFilters({ accounts, categories, currency, locale });
  const { filterState, search, setSearch, fields } = filters;

  const [sheetState, setSheetState] = useState<TransactionSheetState | null>(null);
  const [converting, setConverting] = useState<Transaction | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [handledTxParam, setHandledTxParam] = useState<string | null>(null);

  const filterTags = useMemo(() => collectTagsFromTransactions(transactions, locale), [transactions, locale]);
  const formTags = useMemo(() => mergeTagLists([availableTags, filterTags], locale), [availableTags, filterTags, locale]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const transactionById = useMemo(() => new Map(transactions.map((tx) => [tx.id, tx])), [transactions]);

  const uncategorizedCount = useMemo(() => transactions.filter(isUncategorized).length, [transactions]);
  const showingUncategorizedOnly =
    fields.categoryIds.length === 1 && fields.categoryIds[0] === UNCATEGORIZED_CATEGORY_ID;

  const canConvert = (tx: Transaction) => accounts.length > 1 && isConvertibleToTransfer(tx);

  /* ---------- Deep link from the command palette / dashboard: ?tx=<id> ---------- */
  const txParam = searchParams.get("tx");
  const deepLinked =
    txParam && txParam !== handledTxParam ? transactionById.get(txParam) ?? null : null;
  const activeSheet: TransactionSheetState | null =
    sheetState ?? (deepLinked ? { transaction: deepLinked, mode: "view" } : null);

  function closeSheet() {
    setSheetState(null);
    if (txParam) {
      setHandledTxParam(txParam);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tx");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
  }

  /* ---------- Rows: rules + recurring occurrences, filtered and searched ---------- */
  const rows = useMemo((): ListRow[] => {
    const anchorMonth = new Map<string, string>();
    for (const tx of transactions) if (tx.isRecurring) anchorMonth.set(tx.id, tx.date.slice(0, 7));

    const q = search.trim().toLowerCase();
    const matchesSearch = (tx: Transaction) => {
      if (!q) return true;
      const category = tx.categoryId ? categoryMap.get(tx.categoryId)?.name : "";
      const account = accountMap.get(tx.accountId)?.name;
      return [tx.notes, category, account, ...(tx.tags ?? []), (tx.amount / 100).toFixed(2).replace(".", ",")]
        .join(" ")
        .toLowerCase()
        .includes(q);
    };

    const ruleRows: ListRow[] = transactions
      .filter((tx) => matchesUiFilters(tx, filterState) && matchesSearch(tx))
      .map((tx) => ({ kind: "rule", tx }));
    const occurrenceRows: ListRow[] = occurrences
      .filter((tx) => {
        const anchor = anchorMonth.get(tx.sourceTransactionId);
        if (anchor && tx.date.slice(0, 7) === anchor) return false;
        return matchesUiFilters(tx, filterState) && matchesSearch(tx);
      })
      .map((tx) => ({ kind: "occurrence", tx }));
    return [...ruleRows, ...occurrenceRows];
  }, [transactions, occurrences, filterState, search, categoryMap, accountMap]);

  const totals = useMemo(() => summarizeTransactions(rows.map((r) => r.tx)), [rows]);
  const monthly = useMemo(() => summarizeByMonth(rows.map((r) => r.tx)), [rows]);

  const dayGroups = useMemo(() => {
    const map = new Map<string, ListRow[]>();
    for (const row of rows) {
      const list = map.get(row.tx.date);
      if (list) list.push(row);
      else map.set(row.tx.date, [row]);
    }
    const dayLabels = { today: t("common.today"), yesterday: t("common.yesterday") };
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => {
        const label = relativeDayLabel(date, language, dayLabels, "EEEE d MMMM");
        const net = items.reduce(
          (sum, r) => sum + (r.tx.type === "income" ? r.tx.amount : r.tx.type === "expense" ? -r.tx.amount : 0),
          0
        );
        return { date, label: label.charAt(0).toUpperCase() + label.slice(1), items, net };
      });
  }, [rows, language, t]);

  const emptyYear = transactions.length === 0 && occurrences.length === 0;
  const hasActiveFilters = filters.activeFilterCount > 0 || search.trim() !== "";

  /* ---------- Actions ---------- */
  async function handleDelete(tx: Transaction) {
    const ok = await confirm({
      title: t("transactions.deleteConfirmTitle"),
      description: t("common.cannotUndo"),
      confirmLabel: t("common.delete"),
    });
    if (!ok) return;
    try {
      await deleteTransaction(tx.id, year);
      toast.success(t("transactions.deleted"));
      closeSheet();
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  async function handleCopyRecurring() {
    try {
      const count = await copyRecurringFromPreviousYear(year);
      toast.success(
        count > 0 ? t("transactions.copySuccess", { count, year: year - 1 }) : t("transactions.copyEmpty")
      );
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  const sourceOf = (row: ListRow): Transaction =>
    row.kind === "rule" ? row.tx : transactionById.get(row.tx.sourceTransactionId) ?? row.tx;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("transactions.title")}
        description={t("transactions.description", { year })}
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp />
              <span className="hidden sm:inline">{t("import.button")}</span>
              <span className="sm:hidden">{t("import.buttonShort")}</span>
            </Button>
            <Button variant="outline" onClick={handleCopyRecurring}>
              <Copy />
              <span className="hidden sm:inline">{t("transactions.copyRecurring", { year: year - 1 })}</span>
              <span className="sm:hidden">{t("transactions.copyRecurringShort", { year: year - 1 })}</span>
            </Button>
          </>
        }
      />

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-input bg-card px-3.5 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 sm:max-w-md md:h-10">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("transactions.search")}
              aria-label={t("transactions.search")}
              className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
            />
          </label>
          <Button
            variant="outline"
            onClick={() => setFiltersOpen(true)}
            aria-label={`${t("common.filters")}${filters.activeFilterCount ? ` (${filters.activeFilterCount})` : ""}`}
            className="relative h-11 shrink-0 px-3 md:h-10"
          >
            <SlidersHorizontal />
            <span className="hidden sm:inline">{t("common.filters")}</span>
            {filters.activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[0.6875rem] font-bold text-primary-foreground ring-2 ring-background">
                {filters.activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {(uncategorizedCount > 0 || filters.chips.length > 0) && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            {uncategorizedCount > 0 && !showingUncategorizedOnly && (
              <FilterChip onClick={() => fields.setCategoryIds([UNCATEGORIZED_CATEGORY_ID])}>
                <span className="size-2 rounded-full" style={{ backgroundColor: UNCATEGORIZED_CATEGORY_COLOR }} aria-hidden="true" />
                {t("transactions.uncategorizedCount", { count: uncategorizedCount })}
              </FilterChip>
            )}
            {filters.chips.map((chip) => (
              <FilterChip
                key={chip.key}
                removable
                onClick={chip.onRemove}
                aria-label={`${chip.label} — ${t("common.reset")}`}
              >
                {chip.label}
              </FilterChip>
            ))}
            {filters.chips.length > 1 && (
              <Button variant="ghost" size="sm" className="h-9 shrink-0 rounded-full" onClick={filters.clearFilters}>
                {t("common.clearFilters")}
              </Button>
            )}
          </div>
        )}
      </div>

      {dayGroups.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={emptyYear ? t("transactions.emptyYear") : t("transactions.emptyFiltered")}
          description={emptyYear ? t("transactions.emptyHint") : t("transactions.emptyFilteredHint")}
          action={
            emptyYear ? (
              <>
                <Button asChild>
                  <Link href={withYear("/add")}>
                    <Plus />
                    {t("transactions.addOne")}
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <FileUp />
                  {t("import.button")}
                </Button>
              </>
            ) : (
              hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={() => {
                    filters.clearFilters();
                    setSearch("");
                  }}
                >
                  {t("common.clearFilters")}
                </Button>
              )
            )
          }
        />
      ) : (
        <>
          <TransactionsSummary totals={totals} monthly={monthly} currency={currency} />

          <div className="space-y-4">
            {dayGroups.map((group, index) => (
              <section
                key={group.date}
                aria-label={group.label}
                className={index < ANIMATED_DAY_GROUPS ? "animate-rise" : undefined}
                style={index < ANIMATED_DAY_GROUPS ? { animationDelay: `${index * 50}ms` } : undefined}
              >
                <div className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-10 -mx-4 flex items-baseline justify-between bg-background/85 px-5 py-2 backdrop-blur-md sm:-mx-6 sm:px-7 md:-mx-8 md:px-9">
                  <h2 className="text-eyebrow text-muted-foreground">{group.label}</h2>
                  <Amount cents={group.net} currency={currency} className="text-xs font-semibold text-muted-foreground" />
                </div>
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                  {group.items.map((row) => {
                    const source = sourceOf(row);
                    return (
                      <TransactionRow
                        key={rowKey(row)}
                        tx={row.tx}
                        kind={row.kind}
                        category={row.tx.categoryId ? categoryMap.get(row.tx.categoryId) : undefined}
                        account={accountMap.get(row.tx.accountId)}
                        year={year}
                        currency={currency}
                        onOpen={() =>
                          setSheetState({
                            transaction: source,
                            mode: "view",
                            listContext: { kind: row.kind, displayDate: row.tx.date },
                          })
                        }
                        onEdit={() => setSheetState({ transaction: source, mode: "edit" })}
                        onDelete={() => handleDelete(source)}
                        onConvert={row.kind === "rule" && canConvert(source) ? () => setConverting(source) : undefined}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <TransactionFiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        accounts={accounts}
        categories={categories}
        tagOptions={filterTags}
      />

      {/* Detail (view) / edit sheet */}
      <Sheet open={!!activeSheet} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {activeSheet?.mode === "edit" ? t("transactions.editTitle") : t("transactions.detailTitle")}
            </SheetTitle>
          </SheetHeader>
          <div className="-mx-1 overflow-y-auto px-1">
            {activeSheet?.mode === "view" && (
              <TransactionDetailView
                transaction={activeSheet.transaction}
                accounts={accounts}
                categories={categories}
                year={year}
                currency={currency}
                locale={locale}
                listContext={activeSheet.listContext}
              />
            )}
            {activeSheet?.mode === "edit" && (
              <TransactionForm
                key={activeSheet.transaction.id}
                accounts={accounts}
                categories={categories}
                availableTags={formTags}
                year={year}
                transaction={activeSheet.transaction}
                onSuccess={closeSheet}
                onCancel={
                  activeSheet.listContext
                    ? () => setSheetState({ ...activeSheet, mode: "view" })
                    : undefined
                }
                confirmLabel={activeSheet.listContext ? t("common.confirm") : undefined}
                compact
              />
            )}
          </div>
          {activeSheet?.mode === "view" && (
            <SheetFooter className="grid grid-cols-2 gap-2.5 sm:flex">
              {activeSheet.listContext?.kind !== "occurrence" && canConvert(activeSheet.transaction) && (
                <Button
                  variant="outline"
                  className="col-span-2 sm:mr-auto"
                  onClick={() => setConverting(activeSheet.transaction)}
                >
                  <ArrowLeftRight />
                  {t("transactions.convertToTransfer.button")}
                </Button>
              )}
              <Button variant="destructive" size="lg" onClick={() => handleDelete(activeSheet.transaction)}>
                <Trash2 />
                {t("common.delete")}
              </Button>
              <Button size="lg" onClick={() => setSheetState({ ...activeSheet, mode: "edit" })}>
                {t("common.edit")}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <ConvertToTransferDialog
        transaction={converting}
        year={year}
        accounts={accounts}
        currency={currency}
        locale={locale}
        onOpenChange={(open) => !open && setConverting(null)}
        onConverted={closeSheet}
      />

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} locale={locale} />
    </div>
  );
}
