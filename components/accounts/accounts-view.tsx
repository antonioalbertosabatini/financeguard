"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
  createAccount,
  deleteAccount,
  updateAccount,
} from "@/lib/actions/accounts";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES } from "@/lib/constants";
import type { Account } from "@/lib/schemas/account";
import { formatCents, centsToEuroString, toCents } from "@/lib/utils/money";

type AccountWithBalance = Account & { balance: number };

export function AccountsView({
  accounts,
  currency,
  locale,
}: {
  accounts: AccountWithBalance[];
  currency: string;
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof ACCOUNT_TYPES)[number]>("checking");
  const [initialBalance, setInitialBalance] = useState("0.00");
  const [currencyInput, setCurrencyInput] = useState(currency);

  function openCreate() {
    setEditing(null);
    setName("");
    setType("checking");
    setInitialBalance("0.00");
    setCurrencyInput(currency);
    setOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setName(account.name);
    setType(account.type);
    setInitialBalance(centsToEuroString(account.initialBalance));
    setCurrencyInput(account.currency);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name,
      type,
      initialBalance: toCents(initialBalance),
      currency: currencyInput,
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
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Nuovo conto
          </Button>
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
                <div>
                  <CardTitle className="text-base">{account.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {ACCOUNT_TYPE_LABELS[account.type]}
                  </p>
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
                <p className="text-2xl font-bold">
                  {formatCents(account.balance, account.currency, locale)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica conto" : "Nuovo conto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="balance">Saldo iniziale (€)</Label>
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
            <DialogFooter>
              <Button type="submit">Salva</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
