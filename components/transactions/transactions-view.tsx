"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Filter, Pencil, Plus, Trash2, X } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { CategorySelectItem } from "@/components/categories/category-select-item";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
  income: "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10",
  expense: "bg-rose-500/10 text-rose-700 hover:bg-rose-500/10",
  transfer: "bg-muted text-muted-foreground hover:bg-muted",
};

const TYPE_BORDER_CLASS: Record<Transaction["type"], string> = {
  income: "border-l-emerald-500",
  expense: "border-l-rose-500",
  transfer: "border-l-muted-foreground/30",
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

  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a.name])),
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

  const hasActiveFilters =
    dateFrom !== "" ||
    dateTo !== "" ||
    categoryId !== "all" ||
    accountId !== "all" ||
    type !== "all";

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setCategoryId("all");
    setAccountId("all");
    setType("all");
  }

  async function handleDelete(tx: Transaction) {
    if (!confirm("Eliminare questa transazione?")) return;
    try {
      await deleteTransaction(tx.id, year);
      toast.success("Transazione eliminata");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transazioni"
        description={`Anno ${year} — regole e transazioni singole`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/add">
                <Plus className="size-4" />
                Nuova transazione
              </Link>
            </Button>
            <Button variant="outline" onClick={handleCopyRecurring}>
              <Copy className="size-4" />
              Copia ricorrenti da {year - 1}
            </Button>
          </div>
        }
      />

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="size-4" />
            Filtri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
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

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {dateFrom && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer gap-1 pr-1.5"
                  onClick={() => setDateFrom("")}
                >
                  Da: {formatDate(dateFrom)}
                  <X className="size-3" />
                </Badge>
              )}
              {dateTo && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer gap-1 pr-1.5"
                  onClick={() => setDateTo("")}
                >
                  A: {formatDate(dateTo)}
                  <X className="size-3" />
                </Badge>
              )}
              {categoryId !== "all" && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer gap-1 pr-1.5"
                  onClick={() => setCategoryId("all")}
                >
                  Categoria: {categoryMap[categoryId]?.name ?? categoryId}
                  <X className="size-3" />
                </Badge>
              )}
              {accountId !== "all" && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer gap-1 pr-1.5"
                  onClick={() => setAccountId("all")}
                >
                  Conto: {accountMap[accountId] ?? accountId}
                  <X className="size-3" />
                </Badge>
              )}
              {type !== "all" && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer gap-1 pr-1.5"
                  onClick={() => setType("all")}
                >
                  Tipo: {TRANSACTION_TYPE_LABELS[type as Transaction["type"]]}
                  <X className="size-3" />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Azzera filtri
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="shadow-sm">
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
        <Card className="overflow-hidden shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{filtered.length}</span>
              {" "}
              {filtered.length === 1 ? "transazione" : "transazioni"}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm tabular-nums">
              <span className="text-emerald-600">
                {amountsHidden
                  ? HIDDEN_AMOUNT
                  : `+${formatCentsDisplay(totals.income, currency, locale)}`}
              </span>
              <span className="text-rose-600">
                {amountsHidden
                  ? HIDDEN_AMOUNT
                  : `-${formatCentsDisplay(totals.expense, currency, locale)}`}
              </span>
              <span className="font-medium">
                Saldo:{" "}
                {formatCentsDisplay(totals.net, currency, locale)}
              </span>
            </div>
          </div>
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
                  <TableRow
                    className="bg-muted/40 hover:bg-muted/40"
                  >
                    <TableCell colSpan={8} className="sticky top-0 py-2 font-medium">
                      {group.label}
                      <span className="ml-2 font-normal text-muted-foreground">
                        — {group.items.length}{" "}
                        {group.items.length === 1 ? "transazione" : "transazioni"}
                      </span>
                    </TableCell>
                  </TableRow>
                  {group.items.map((tx) => {
                    const category = tx.categoryId
                      ? categoryMap[tx.categoryId]
                      : undefined;
                    return (
                      <TableRow
                        key={tx.id}
                        className={cn(
                          "border-l-2 hover:bg-muted/50",
                          TYPE_BORDER_CLASS[tx.type]
                        )}
                      >
                        <TableCell className="tabular-nums">
                          {formatDate(tx.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="secondary"
                              className={cn("w-fit", TYPE_BADGE_CLASS[tx.type])}
                            >
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
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              <CategoryIcon
                                name={category.icon}
                                color={category.color}
                                className="size-3.5"
                              />
                              <span className="truncate">{category.name}</span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{accountMap[tx.accountId] ?? "—"}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium tabular-nums",
                            tx.type === "income" && "text-emerald-600",
                            tx.type === "expense" && "text-rose-600"
                          )}
                        >
                          {formatAmount(tx)}
                        </TableCell>
                        <TableCell>
                          <TagBadges tags={tx.tags ?? []} />
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {tx.notes || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setEditing(tx)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(tx)}
                            >
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
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica transazione</DialogTitle>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
