"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { deleteBudget, upsertBudget } from "@/lib/actions/budgets";
import type { Category } from "@/lib/schemas/category";
import { formatCents, toCents } from "@/lib/utils/money";

type BudgetItem = {
  id: string;
  categoryId: string;
  monthlyLimit: number;
  categoryName: string;
  categoryColor: string;
  spent: number;
};

export function BudgetView({
  items,
  categories,
  currency,
  locale,
}: {
  items: BudgetItem[];
  categories: Category[];
  currency: string;
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [limitEuro, setLimitEuro] = useState("");

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const usedCategoryIds = new Set(items.map((i) => i.categoryId));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await upsertBudget({
        categoryId,
        monthlyLimit: toCents(limitEuro),
      });
      toast.success("Budget salvato");
      setOpen(false);
      setCategoryId("");
      setLimitEuro("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo budget?")) return;
    try {
      await deleteBudget(id);
      toast.success("Budget eliminato");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget"
        description="Limiti mensili per categoria"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Nuovo budget
          </Button>
        }
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nessun budget impostato per il mese corrente.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const pct = Math.min(
              100,
              item.monthlyLimit > 0
                ? (item.spent / item.monthlyLimit) * 100
                : 0
            );
            const overBudget = item.spent > item.monthlyLimit;
            return (
              <Card key={item.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <CardTitle className="text-base">{item.categoryName}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>
                      {formatCents(item.spent, currency, locale)} spesi
                    </span>
                    <span className="text-muted-foreground">
                      limite {formatCents(item.monthlyLimit, currency, locale)}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className={overBudget ? "[&>div]:bg-destructive" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    {pct.toFixed(0)}% utilizzato
                    {overBudget && " — budget superato"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo budget</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories
                    .filter((c) => !usedCategoryIds.has(c.id))
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit">Limite mensile (€)</Label>
              <Input
                id="limit"
                value={limitEuro}
                onChange={(e) => setLimitEuro(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!categoryId}>
                Salva
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
