"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { CategorySelectItem } from "@/components/categories/category-select-item";
import { TagBadges } from "@/components/tags/tag-badges";
import { TagSingleInput } from "@/components/tags/tag-single-input";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { deleteBudget, updateBudget, upsertBudget } from "@/lib/actions/budgets";
import { MONTH_LABELS_FULL } from "@/lib/constants";
import { CATEGORY_ICON_NAMES } from "@/lib/constants/category-icons";
import type { Category } from "@/lib/schemas/category";
import { formatDate } from "@/lib/utils/dates";
import { centsToEuroString, toCents } from "@/lib/utils/money";
import { cn } from "@/lib/utils";
import { useFormatCents } from "@/hooks/use-format-cents";

const NO_CATEGORY = "none";
const DEFAULT_BUDGET_ICON = "piggy-bank";
const TAG_COLOR = "#6366F1";

type BudgetExpense = {
  id: string;
  amount: number;
  tags: string[];
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  categoryIcon?: string;
  date: string;
  notes: string;
};

type BudgetItem = {
  id: string;
  name: string;
  categoryId?: string;
  tag?: string;
  icon: string;
  monthlyLimit: number;
  categoryName?: string;
  categoryColor: string;
  categoryIcon?: string;
  spent: number;
  expenses: BudgetExpense[];
};

export function BudgetView({
  items,
  categories,
  availableTags,
  year,
  month,
  currency,
  locale,
}: {
  items: BudgetItem[];
  categories: Category[];
  availableTags: string[];
  year: number;
  month: number;
  currency: string;
  locale: string;
}) {
  const formatAmount = useFormatCents();
  const [open, setOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(NO_CATEGORY);
  const [tag, setTag] = useState("");
  const [icon, setIcon] = useState(DEFAULT_BUDGET_ICON);
  const [limitEuro, setLimitEuro] = useState("");

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const selectedCategoryId = categoryId === NO_CATEGORY ? undefined : categoryId;
  const normalizedTag = tag.trim().toLowerCase();
  const selectedKey = getBudgetKey(selectedCategoryId, normalizedTag);
  const duplicateBudget =
    !!selectedKey &&
    items.some(
      (item) =>
        item.id !== editingBudget?.id &&
        getBudgetKey(item.categoryId, item.tag) === selectedKey
    );
  const canSubmit =
    !!name.trim() &&
    (!!selectedCategoryId || !!normalizedTag) &&
    toCents(limitEuro) > 0 &&
    !duplicateBudget;

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.spent += item.spent;
        acc.limit += item.monthlyLimit;
        return acc;
      },
      { spent: 0, limit: 0 }
    );
  }, [items]);

  function resetForm() {
    setEditingBudget(null);
    setName("");
    setCategoryId(NO_CATEGORY);
    setTag("");
    setIcon(DEFAULT_BUDGET_ICON);
    setLimitEuro("");
  }

  function openCreateDialog() {
    resetForm();
    setOpen(true);
  }

  function openEditDialog(item: BudgetItem) {
    setEditingBudget(item);
    setName(item.name);
    setCategoryId(item.categoryId ?? NO_CATEGORY);
    setTag(item.tag ?? "");
    setIcon(item.icon);
    setLimitEuro(centsToEuroString(item.monthlyLimit));
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      const payload = {
        name: name.trim(),
        categoryId: selectedCategoryId,
        tag: normalizedTag || undefined,
        icon,
        monthlyLimit: toCents(limitEuro),
      };

      if (editingBudget) {
        await updateBudget(editingBudget.id, payload);
        toast.success("Budget aggiornato");
      } else {
        await upsertBudget(payload);
        toast.success("Budget salvato");
      }
      setOpen(false);
      resetForm();
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
        description={`Limiti mensili per categoria, tag o combinazioni · ${MONTH_LABELS_FULL[month - 1]} ${year}`}
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="size-4" />
            Nuovo budget
          </Button>
        }
      />

      {items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card size="sm">
            <CardHeader>
              <CardDescription>Budget attivi</CardDescription>
              <CardTitle>{items.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Speso nel mese</CardDescription>
              <CardTitle>{formatAmount(totals.spent, currency, locale)}</CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Limite totale</CardDescription>
              <CardTitle>{formatAmount(totals.limit, currency, locale)}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
              <CategoryIcon
                name={DEFAULT_BUDGET_ICON}
                color={TAG_COLOR}
                className="size-6"
              />
            </div>
            <h3 className="font-medium">Nessun budget impostato</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Crea un budget per una categoria, un singolo tag o una combinazione
              categoria + tag.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <BudgetCard
              key={item.id}
              item={item}
              currency={currency}
              locale={locale}
              onEdit={openEditDialog}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {editingBudget ? "Modifica budget" : "Nuovo budget"}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="budget-name">Nome budget</Label>
              <Input
                id="budget-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Spesa casa"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Opzionale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Nessuna categoria</SelectItem>
                    {expenseCategories.map((c) => (
                      <CategorySelectItem key={c.id} category={c} />
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget-tag">Tag singolo</Label>
                <TagSingleInput
                  id="budget-tag"
                  value={tag}
                  onChange={setTag}
                  suggestions={availableTags}
                  placeholder="es. lavoro"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Icona</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_ICON_NAMES.map((iconName) => (
                      <SelectItem key={iconName} value={iconName}>
                        <span className="flex items-center gap-2">
                          <CategoryIcon
                            name={iconName}
                            color={TAG_COLOR}
                            className="size-3.5"
                          />
                          {iconName}
                        </span>
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
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              {duplicateBudget
                ? "Esiste già un budget con questa combinazione di categoria e tag."
                : "Lascia vuoto uno dei due campi per creare un budget solo categoria o solo tag."}
            </div>

            <SheetFooter>
              <Button type="submit" disabled={!canSubmit}>
                {editingBudget ? "Aggiorna" : "Salva"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function BudgetCard({
  item,
  currency,
  locale,
  onEdit,
  onDelete,
}: {
  item: BudgetItem;
  currency: string;
  locale: string;
  onEdit: (item: BudgetItem) => void;
  onDelete: (id: string) => void;
}) {
  const formatAmount = useFormatCents();
  const pctRaw = item.monthlyLimit > 0 ? (item.spent / item.monthlyLimit) * 100 : 0;
  const pct = Math.min(100, pctRaw);
  const overBudget = item.spent > item.monthlyLimit;
  const remaining = item.monthlyLimit - item.spent;
  const accentColor = item.categoryId ? item.categoryColor : TAG_COLOR;

  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${accentColor}1A` }}
            >
              <CategoryIcon name={item.icon} color={accentColor} className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate">{item.name}</CardTitle>
              <div className="flex flex-wrap gap-1.5">
                {item.categoryName && (
                  <Badge variant="secondary" className="gap-1">
                    {item.categoryIcon && (
                      <CategoryIcon
                        name={item.categoryIcon}
                        color={item.categoryColor}
                        className="size-3"
                      />
                    )}
                    {item.categoryName}
                  </Badge>
                )}
                {item.tag && (
                  <Badge variant="outline" className="gap-1">
                    <Tag className="size-3" />
                    {item.tag}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(item)}
              aria-label={`Modifica budget ${item.name}`}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(item.id)}
              aria-label={`Elimina budget ${item.name}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Speso" value={formatAmount(item.spent, currency, locale)} />
          <Metric label="Limite" value={formatAmount(item.monthlyLimit, currency, locale)} />
          <Metric
            label={overBudget ? "Superato di" : "Residuo"}
            value={formatAmount(Math.abs(remaining), currency, locale)}
            className={overBudget ? "text-destructive" : "text-success"}
          />
        </div>

        <div className="space-y-2">
          <Progress
            value={pct}
            className={cn(overBudget && "[&>div]:bg-destructive")}
          />
          <p className="flex justify-between text-xs text-muted-foreground">
            <span>{pctRaw.toFixed(0)}% utilizzato</span>
            <span>{item.expenses.length} {item.expenses.length === 1 ? "spesa" : "spese"}</span>
          </p>
        </div>

        <Collapsible>
          <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50">
            Dettaglio spese
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            {item.expenses.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Nessuna spesa per questo budget nel mese selezionato.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Tag</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Importo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="tabular-nums">
                          {formatDate(expense.date)}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            {expense.categoryIcon && (
                              <CategoryIcon
                                name={expense.categoryIcon}
                                color={expense.categoryColor}
                                className="size-3.5"
                              />
                            )}
                            <span>{expense.categoryName}</span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <TagBadges tags={expense.tags} />
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate">
                          {expense.notes || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-danger">
                          -{formatAmount(expense.amount, currency, locale)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-medium tabular-nums", className)}>{value}</p>
    </div>
  );
}

function getBudgetKey(categoryId?: string, tag?: string): string {
  if (!categoryId && !tag) return "";
  return `${categoryId ?? ""}::${tag?.trim().toLowerCase() ?? ""}`;
}
