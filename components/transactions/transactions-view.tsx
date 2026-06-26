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
import { TagBadges } from "@/components/tags/tag-badges";
import {
  copyRecurringFromPreviousYear,
  deleteTransaction,
} from "@/lib/actions/transactions";
import { MONTH_LABELS_FULL, TRANSACTION_TYPE_LABELS, TRANSACTION_TYPES } from "@/lib/constants";
import type { Account } from "@/lib/schemas/account";
import type { Category } from "@/lib/schemas/category";
import type { Transaction } from "@/lib/schemas/transaction";
import { useAmountVisibility } from "@/hooks/use-amount-visibility";
import { useFormatCents } from "@/hooks/use-format-cents";
import { formatDate } from "@/lib/utils/dates";
import { HIDDEN_AMOUNT } from "@/lib/utils/money";
import { getRecurrenceIntervalLabel } from "@/lib/utils/recurrence";
import { cn } from "@/lib/utils";

type TransactionsViewProps = {
  transactions: Transaction[];
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

function formatMonthGroup(date: string): string {
  const month = parseInt(date.slice(5, 7), 10);
  const year = date.slice(0, 4);
  return `${MONTH_LABELS_FULL[month - 1]} ${year}`;
}

export function TransactionsView({
  transactions,
  accounts,
  categories,
  availableTags,
  year,
  currency,
  locale,
}: TransactionsViewProps) {
  const formatCentsDisplay = useFormatCents();
  const { amountsHidden } = useAmountVisibility();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [accountId, setAccountId] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts]
  );
  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (dateFrom && tx.date < dateFrom) return false;
      if (dateTo && tx.date > dateTo) return false;
      if (categoryId !== "all" && tx.categoryId !== categoryId) return false;
      if (accountId !== "all" && tx.accountId !== accountId) return false;
      if (type !== "all" && tx.type !== type) return false;
      return true;
    });
  }, [transactions, dateFrom, dateTo, categoryId, accountId, type]);

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
    const groups: { monthKey: string; label: string; items: Transaction[] }[] = [];
    const map = new Map<string, Transaction[]>();

    for (const tx of filtered) {
      const key = tx.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }

    for (const [monthKey, items] of map) {
      groups.push({
        monthKey,
        label: formatMonthGroup(`${monthKey}-01`),
        items,
      });
    }

    return groups;
  }, [filtered]);

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
      toast.success("Transazione eliminata");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setDeleting(null);
    }
  }

  async function handleCopyRecurring() {
    try {
      const count = await copyRecurringFromPreviousYear(year);
      toast.success(
        count > 0
          ? `${count} regole ricorrenti copiate da ${year - 1}`
          : "Nessuna regola ricorrente da copiare"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  function formatAmount(tx: Transaction) {
    if (amountsHidden) return HIDDEN_AMOUNT;
    const formatted = formatCentsDisplay(tx.amount, currency, locale);
    if (tx.type === "income") return `+${formatted}`;
    if (tx.type === "expense") return `-${formatted}`;
    return formatted;
  }

  const filterFields = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Da data</Label>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">A data</Label>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Categoria</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte</SelectItem>
            {categories.map((c) => (
              <CategorySelectItem key={c.id} category={c} />
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Conto</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
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
        <Label className="text-xs text-muted-foreground">Tipo</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            {TRANSACTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{TRANSACTION_TYPE_LABELS[t]}</SelectItem>
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
          Da: {formatDate(dateFrom)}
          <X className="size-3" />
        </Badge>
      )}
      {dateTo && (
        <Badge variant="secondary" className="cursor-pointer gap-1 pr-1.5" onClick={() => setDateTo("")}>
          A: {formatDate(dateTo)}
          <X className="size-3" />
        </Badge>
      )}
      {categoryId !== "all" && (
        <Badge variant="secondary" className="cursor-pointer gap-1 pr-1.5" onClick={() => setCategoryId("all")}>
          Categoria: {categoryMap[categoryId]?.name ?? categoryId}
          <X className="size-3" />
        </Badge>
      )}
      {accountId !== "all" && (
        <Badge variant="secondary" className="cursor-pointer gap-1 pr-1.5" onClick={() => setAccountId("all")}>
          Conto: {accountMap[accountId]?.name ?? accountId}
          <X className="size-3" />
        </Badge>
      )}
      {type !== "all" && (
        <Badge variant="secondary" className="cursor-pointer gap-1 pr-1.5" onClick={() => setType("all")}>
          Tipo: {TRANSACTION_TYPE_LABELS[type as Transaction["type"]]}
          <X className="size-3" />
        </Badge>
      )}
      <Button variant="ghost" size="sm" onClick={clearFilters}>
        Azzera filtri
      </Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transazioni"
        description={`Anno ${year} — regole e transazioni singole`}
        actions={
          <>
            <Button variant="outline" className="hidden sm:inline-flex" asChild>
              <Link href="/add">
                <Plus className="size-4" />
                Nuova transazione
              </Link>
            </Button>
            <Button variant="outline" onClick={handleCopyRecurring}>
              <Copy className="size-4" />
              <span className="hidden sm:inline">Copia ricorrenti da {year - 1}</span>
              <span className="sm:hidden">Copia {year - 1}</span>
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
          Filtri
          {activeFilterCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Azzera
          </Button>
        )}
        <div className="hidden flex-1 sm:block">{activeChips}</div>
      </div>
      <div className="sm:hidden">{activeChips}</div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>
              {transactions.length === 0
                ? "Nessuna transazione registrata per questo anno."
                : "Nessuna transazione trovata per i filtri selezionati."}
            </p>
            <Button variant="link" asChild className="mt-2">
              <Link href="/add">Aggiungi una transazione</Link>
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
                {filtered.length === 1 ? "transazione" : "transazioni"}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular-nums">
                <span className="text-success">
                  {amountsHidden ? HIDDEN_AMOUNT : `+${formatCentsDisplay(totals.income, currency, locale)}`}
                </span>
                <span className="text-danger">
                  {amountsHidden ? HIDDEN_AMOUNT : `-${formatCentsDisplay(totals.expense, currency, locale)}`}
                </span>
                <span className="font-medium">
                  Saldo: {formatCentsDisplay(totals.net, currency, locale)}
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
                    {group.items.length === 1 ? "transazione" : "transazioni"}
                  </span>
                </div>
                <Card className="divide-y divide-border/70 py-0">
                  {group.items.map((tx) => {
                    const category = tx.categoryId ? categoryMap[tx.categoryId] : undefined;
                    const account = accountMap[tx.accountId];
                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => setEditing(tx)}
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
                              {category?.name ?? TRANSACTION_TYPE_LABELS[tx.type]}
                            </span>
                            {tx.isRecurring && (
                              <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">
                                {getRecurrenceIntervalLabel(tx, year)}
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
                            aria-label="Elimina"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleting(tx);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeleting(tx);
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
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conto</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Note</TableHead>
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
                          {group.items.length === 1 ? "transazione" : "transazioni"}
                        </span>
                      </TableCell>
                    </TableRow>
                    {group.items.map((tx) => {
                      const category = tx.categoryId ? categoryMap[tx.categoryId] : undefined;
                      return (
                        <TableRow
                          key={tx.id}
                          className={cn("border-l-2 hover:bg-muted/50", TYPE_BORDER_CLASS[tx.type])}
                        >
                          <TableCell className="tabular-nums">{formatDate(tx.date)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="secondary" className={cn("w-fit", TYPE_BADGE_CLASS[tx.type])}>
                                {TRANSACTION_TYPE_LABELS[tx.type]}
                              </Badge>
                              {tx.isRecurring && (
                                <Badge variant="outline" className="w-fit text-xs">
                                  Ricorrente · {getRecurrenceIntervalLabel(tx, year)}
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
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {accountMap[tx.accountId] ? (
                              <span className="flex items-center gap-2">
                                <AccountIcon name={accountMap[tx.accountId]!.icon} className="size-3.5 text-muted-foreground" />
                                {accountMap[tx.accountId]!.name}
                              </span>
                            ) : (
                              "—"
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
                          <TableCell className="max-w-[200px] truncate">{tx.notes || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon-sm" onClick={() => setEditing(tx)}>
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(tx)}>
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
            <SheetTitle>Filtri</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto">{filterFields}</div>
          <SheetFooter>
            <Button variant="ghost" onClick={clearFilters} disabled={!hasActiveFilters}>
              Azzera filtri
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Mostra risultati</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit sheet */}
      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Modifica transazione</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto">
            {editing && (
              <TransactionForm
                accounts={accounts}
                categories={categories}
                availableTags={availableTags}
                year={year}
                transaction={editing}
                onSuccess={() => setEditing(null)}
                compact
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminare la transazione?</DialogTitle>
            <DialogDescription>
              L&apos;operazione non puo&apos; essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
