"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Pencil, Trash2 } from "lucide-react";
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
import {
  copyRecurringFromPreviousYear,
  deleteTransaction,
} from "@/lib/actions/transactions";
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPES } from "@/lib/constants";
import type { Account } from "@/lib/schemas/account";
import type { Category } from "@/lib/schemas/category";
import type { Transaction } from "@/lib/schemas/transaction";
import { formatDate } from "@/lib/utils/dates";
import { formatCents } from "@/lib/utils/money";
import { getRecurrenceIntervalLabel } from "@/lib/utils/recurrence";

type TransactionsViewProps = {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  year: number;
  currency: string;
  locale: string;
};

export function TransactionsView({
  transactions,
  accounts,
  categories,
  year,
  currency,
  locale,
}: TransactionsViewProps) {
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
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transazioni"
        description={`Anno ${year} — regole e transazioni singole`}
        actions={
          <Button variant="outline" onClick={handleCopyRecurring}>
            <Copy className="size-4" />
            Copia ricorrenti da {year - 1}
          </Button>
        }
      />

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Filtri
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nessuna transazione trovata per i filtri selezionati.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conto</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="tabular-nums">{formatDate(tx.date)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span>{TRANSACTION_TYPE_LABELS[tx.type]}</span>
                      {tx.isRecurring && (
                        <Badge variant="secondary" className="w-fit text-xs">
                          Ricorrente · {getRecurrenceIntervalLabel(tx, year)}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {tx.categoryId ? categoryMap[tx.categoryId] ?? "—" : "—"}
                  </TableCell>
                  <TableCell>{accountMap[tx.accountId] ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCents(tx.amount, currency, locale)}
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
