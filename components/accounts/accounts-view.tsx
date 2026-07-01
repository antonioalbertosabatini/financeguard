"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  ChevronDown,
  Filter,
  Shuffle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AccountIcon } from "@/components/accounts/account-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  createAccount,
  deleteAccount,
  updateAccount,
} from "@/lib/actions/accounts";
import {
  createAccountTransfer,
  deleteAccountTransfer,
} from "@/lib/actions/account-transfers";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES } from "@/lib/constants";
import { ACCOUNT_ICON_NAMES } from "@/lib/constants/account-icons";
import type { Account } from "@/lib/schemas/account";
import { useFormatCents } from "@/hooks/use-format-cents";
import { centsToEuroString, toCents } from "@/lib/utils/money";
import { cn } from "@/lib/utils";
import type { AccountTransfer } from "@/lib/schemas/account-transfer";
import { formatDate, todayISO } from "@/lib/utils/dates";

type AccountWithBalance = Account & { balance: number };

type AccountsAnalysis = {
  accountsAsOf: AccountWithBalance[];
  accountsAll: AccountWithBalance[];
  totalAsOf: number;
  totalAll: number;
  asOfISO: string;
};

export function AccountsView({
  accounts,
  analysis,
  transfers,
  currency,
  locale,
  year,
}: {
  accounts: AccountWithBalance[];
  analysis: AccountsAnalysis;
  transfers: AccountTransfer[];
  currency: string;
  locale: string;
  year: number;
}) {
  const formatAmount = useFormatCents();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof ACCOUNT_TYPES)[number]>("checking");
  const [initialBalance, setInitialBalance] = useState("0.00");
  const [currencyInput, setCurrencyInput] = useState(currency);
  const [icon, setIcon] = useState<string>(ACCOUNT_ICON_NAMES[0]);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferDate, setTransferDate] = useState(() => {
    const today = todayISO();
    return today.startsWith(String(year)) ? today : `${year}-01-01`;
  });
  const [transferAmount, setTransferAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [deletingTransfer, setDeletingTransfer] = useState<AccountTransfer | null>(
    null
  );

  const [transfersOpen, setTransfersOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [transferFiltersOpen, setTransferFiltersOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterFrom, setFilterFrom] = useState<string>("all");
  const [filterTo, setFilterTo] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts]
  );

  const summaryRows = useMemo(() => {
    const allMap = Object.fromEntries(
      analysis.accountsAll.map((a) => [a.id, a.balance])
    );
    return analysis.accountsAsOf.map((account) => {
      const balanceAll = allMap[account.id] ?? account.balance;
      return {
        account,
        balanceAsOf: account.balance,
        balanceAll,
        delta: balanceAll - account.balance,
      };
    });
  }, [analysis]);

  const hasFutureDelta = analysis.totalAll !== analysis.totalAsOf;

  const filteredTransfers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = transfers.filter((tr) => {
      if (dateFrom && tr.date < dateFrom) return false;
      if (dateTo && tr.date > dateTo) return false;
      if (filterFrom !== "all" && tr.fromAccountId !== filterFrom) return false;
      if (filterTo !== "all" && tr.toAccountId !== filterTo) return false;
      if (q && !(tr.notes ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
    base.sort((a, b) =>
      order === "desc" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
    );
    return base;
  }, [transfers, dateFrom, dateTo, filterFrom, filterTo, query, order]);

  const hasActiveTransferFilters =
    dateFrom !== "" ||
    dateTo !== "" ||
    filterFrom !== "all" ||
    filterTo !== "all" ||
    query.trim() !== "";

  const TYPE_STYLE: Record<Account["type"], { icon: string; badge: string }> = {
    checking: {
      icon: "bg-sky-500/10 text-sky-700",
      badge: "bg-sky-500/10 text-sky-700 hover:bg-sky-500/10",
    },
    cash: {
      icon: "bg-emerald-500/10 text-emerald-700",
      badge: "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10",
    },
    savings: {
      icon: "bg-violet-500/10 text-violet-700",
      badge: "bg-violet-500/10 text-violet-700 hover:bg-violet-500/10",
    },
    credit_card: {
      icon: "bg-amber-500/10 text-amber-700",
      badge: "bg-amber-500/10 text-amber-700 hover:bg-amber-500/10",
    },
  };

  function openCreate() {
    setEditing(null);
    setName("");
    setType("checking");
    setInitialBalance("0.00");
    setCurrencyInput(currency);
    setIcon(ACCOUNT_ICON_NAMES[0]);
    setOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setName(account.name);
    setType(account.type);
    setInitialBalance(centsToEuroString(account.initialBalance));
    setCurrencyInput(account.currency);
    setIcon(account.icon);
    setOpen(true);
  }

  function openTransfer() {
    const today = todayISO();
    setTransferDate(today.startsWith(String(year)) ? today : `${year}-01-01`);
    setTransferAmount("");
    setFromAccountId(accounts[0]?.id ?? "");
    setToAccountId(accounts[1]?.id ?? "");
    setTransferNotes("");
    setTransferOpen(true);
  }

  function ensureDifferentAccounts(nextFrom: string, nextTo: string) {
    if (!nextFrom || !nextTo || nextFrom !== nextTo) {
      return { from: nextFrom, to: nextTo };
    }
    const alternative =
      accounts.find((a) => a.id !== nextFrom)?.id ?? nextTo;
    return { from: nextFrom, to: alternative || nextTo };
  }

  function handleChangeFromAccount(nextFrom: string) {
    const ensured = ensureDifferentAccounts(nextFrom, toAccountId);
    setFromAccountId(ensured.from);
    if (ensured.to !== toAccountId) setToAccountId(ensured.to);
  }

  function handleChangeToAccount(nextTo: string) {
    const ensured = ensureDifferentAccounts(fromAccountId, nextTo);
    setToAccountId(ensured.to);
    if (ensured.from !== fromAccountId) setFromAccountId(ensured.from);
  }

  function handleSwapAccounts() {
    if (!fromAccountId || !toAccountId) return;
    // Swap “atomico”: evita stati intermedi in cui un value non esiste tra le opzioni.
    const nextFrom = toAccountId;
    const nextTo = fromAccountId;
    const ensured = ensureDifferentAccounts(nextFrom, nextTo);
    setFromAccountId(ensured.from);
    setToAccountId(ensured.to);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name,
      type,
      initialBalance: toCents(initialBalance),
      currency: currencyInput,
      icon,
    };
    try {
      if (editing) {
        await updateAccount(editing.id, data);
        toast.success("Conto aggiornato");
      } else {
        await createAccount(data);
        toast.success("Conto creato");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createAccountTransfer({
        date: transferDate,
        amount: toCents(transferAmount),
        fromAccountId,
        toAccountId,
        notes: transferNotes,
      });
      toast.success("Trasferimento registrato");
      setTransferOpen(false);
      setTransfersOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  async function handleDeleteTransfer() {
    if (!deletingTransfer) return;
    try {
      await deleteAccountTransfer(deletingTransfer.id, year);
      toast.success("Trasferimento eliminato");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setDeletingTransfer(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo conto?")) return;
    try {
      await deleteAccount(id);
      toast.success("Conto eliminato");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conti"
        description="Gestisci i tuoi conti"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              className="shadow-sm"
              onClick={openTransfer}
              disabled={accounts.length < 2}
              title={accounts.length < 2 ? "Servono almeno 2 conti" : undefined}
            >
              <ArrowLeftRight className="size-4" />
              Trasferisci
            </Button>
            <Button variant="outline" onClick={openCreate}>
              <Plus className="size-4" />
              Nuovo conto
            </Button>
          </div>
        }
      />

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nessun conto. Creane uno per iniziare.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg border",
                      account.balance > 0
                        ? "border-success/20 bg-success/10 text-success"
                        : account.balance < 0
                          ? "border-danger/20 bg-danger/10 text-danger"
                          : TYPE_STYLE[account.type].icon
                    )}
                  >
                    <AccountIcon name={account.icon} className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{account.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(account)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(account.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {formatAmount(account.balance, account.currency, locale)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Modifica conto" : "Nuovo conto"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ACCOUNT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Icona</Label>
              <div className="max-h-60 overflow-y-auto rounded-lg border p-2">
                <div className="grid grid-cols-6 gap-2">
                  {ACCOUNT_ICON_NAMES.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      title={opt}
                      onClick={() => setIcon(opt)}
                      className={cn(
                        "flex size-10 items-center justify-center rounded-lg border transition-colors",
                        icon === opt
                          ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <AccountIcon name={opt} className="size-5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="balance">
                  Saldo iniziale ({currencyInput.toUpperCase()})
                </Label>
                <Input
                  id="balance"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Valuta</Label>
                <Input
                  id="currency"
                  value={currencyInput}
                  onChange={(e) => setCurrencyInput(e.target.value.toUpperCase())}
                  maxLength={3}
                  required
                />
              </div>
            </div>
            <SheetFooter>
              <Button type="submit">Salva</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={transferOpen} onOpenChange={setTransferOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Trasferimento tra conti</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleTransferSubmit} className="space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="tr-date">Data</Label>
              <Input
                id="tr-date"
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tr-amount">Importo ({currency})</Label>
              <Input
                id="tr-amount"
                placeholder="0.00"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div className="space-y-2">
                <Label>Da</Label>
                <Select value={fromAccountId} onValueChange={handleChangeFromAccount}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona conto" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id} disabled={a.id === toAccountId}>
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
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mb-3"
                onClick={handleSwapAccounts}
                disabled={!fromAccountId || !toAccountId}
                title="Scambia conti"
              >
                <Shuffle className="size-4" />
              </Button>
              <div className="space-y-2">
                <Label>A</Label>
                <Select value={toAccountId} onValueChange={handleChangeToAccount}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona conto" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id} disabled={a.id === fromAccountId}>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="tr-notes">Note</Label>
              <Input
                id="tr-notes"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Es. giroconto risparmio"
              />
            </div>
            <SheetFooter>
              <Button type="submit">Salva</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Card className="shadow-sm">
        <Collapsible open={transfersOpen} onOpenChange={setTransfersOpen}>
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      transfersOpen && "rotate-180"
                    )}
                  />
                  Trasferimenti
                </Button>
              </CollapsibleTrigger>
              <span className="text-sm text-muted-foreground">
                {filteredTransfers.length}/{transfers.length}
              </span>
            </div>
            <Collapsible open={transferFiltersOpen} onOpenChange={setTransferFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <Filter className="size-4" />
                  Filtri
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      transferFiltersOpen && "rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent />
            </Collapsible>
          </div>

          <CollapsibleContent>
            <CardContent className="space-y-4 pt-4">
              <Collapsible open={transferFiltersOpen} onOpenChange={setTransferFiltersOpen}>
                <CollapsibleContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Da data</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">A data</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Da</Label>
                      <Select value={filterFrom} onValueChange={setFilterFrom}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
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
                      <Label className="text-xs text-muted-foreground">A</Label>
                      <Select value={filterTo} onValueChange={setFilterTo}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
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
                    <div className="space-y-1.5 lg:col-span-2">
                      <Label className="text-xs text-muted-foreground">Cerca note</Label>
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="testo…"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Ordine</Label>
                      <Select
                        value={order}
                        onValueChange={(v) => setOrder(v as typeof order)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">Più recenti</SelectItem>
                          <SelectItem value="asc">Più vecchi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {hasActiveTransferFilters && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-muted-foreground">
                        Filtri attivi
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDateFrom("");
                          setDateTo("");
                          setFilterFrom("all");
                          setFilterTo("all");
                          setQuery("");
                        }}
                      >
                        <X className="size-4" />
                        Azzera
                      </Button>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {filteredTransfers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nessun trasferimento per i filtri selezionati.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Da</TableHead>
                      <TableHead>A</TableHead>
                      <TableHead className="text-right">Importo</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransfers.map((tr) => {
                      const from = accountMap[tr.fromAccountId];
                      const to = accountMap[tr.toAccountId];
                      const fromCurrency = from?.currency ?? currency;
                      return (
                        <TableRow key={tr.id}>
                          <TableCell className="tabular-nums">
                            {formatDate(tr.date)}
                          </TableCell>
                          <TableCell>
                            {from ? (
                              <span className="flex items-center gap-2">
                                <AccountIcon
                                  name={from.icon}
                                  className="size-3.5 text-muted-foreground"
                                />
                                {from.name}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {to ? (
                              <span className="flex items-center gap-2">
                                <AccountIcon
                                  name={to.icon}
                                  className="size-3.5 text-muted-foreground"
                                />
                                {to.name}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatAmount(tr.amount, fromCurrency, locale)}
                          </TableCell>
                          <TableCell className="max-w-[320px] truncate">
                            {tr.notes || "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeletingTransfer(tr)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {accounts.length > 0 && (
        <Card className="shadow-sm">
          <Collapsible open={analysisOpen} onOpenChange={setAnalysisOpen}>
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        analysisOpen && "rotate-180"
                      )}
                    />
                    Analisi Conti
                  </Button>
                </CollapsibleTrigger>
                <span className="text-sm text-muted-foreground">
                  al {formatDate(analysis.asOfISO)}
                </span>
              </div>
            </div>

            <CollapsibleContent>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conto</TableHead>
                      <TableHead className="text-right">Saldo attuale</TableHead>
                      <TableHead className="text-right">
                        Saldo con tutte le transazioni
                      </TableHead>
                      <TableHead className="text-right">Delta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-muted/40 font-medium">
                      <TableCell>Totale</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(analysis.totalAsOf, currency, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(analysis.totalAll, currency, locale)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          hasFutureDelta && analysis.totalAll - analysis.totalAsOf > 0
                            ? "text-success"
                            : hasFutureDelta && analysis.totalAll - analysis.totalAsOf < 0
                              ? "text-danger"
                              : ""
                        )}
                      >
                        {formatAmount(
                          analysis.totalAll - analysis.totalAsOf,
                          currency,
                          locale
                        )}
                      </TableCell>
                    </TableRow>
                    {summaryRows.map((row) => (
                      <TableRow key={row.account.id}>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <AccountIcon
                              name={row.account.icon}
                              className="size-3.5 text-muted-foreground"
                            />
                            {row.account.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatAmount(row.balanceAsOf, row.account.currency, locale)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatAmount(row.balanceAll, row.account.currency, locale)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            row.delta > 0
                              ? "text-success"
                              : row.delta < 0
                                ? "text-danger"
                                : ""
                          )}
                        >
                          {formatAmount(row.delta, row.account.currency, locale)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      <Dialog
        open={!!deletingTransfer}
        onOpenChange={(open) => !open && setDeletingTransfer(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminare il trasferimento?</DialogTitle>
            <DialogDescription>
              L&apos;operazione non puo&apos; essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTransfer(null)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDeleteTransfer}>
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
