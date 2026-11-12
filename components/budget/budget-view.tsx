"use client";

import { useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { Plus } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { CategorySelectItem } from "@/components/categories/category-select-item";
import { TagSingleInput } from "@/components/tags/tag-single-input";
import { PageHeader } from "@/components/layout/page-header";
import { Amount } from "@/components/common/amount";
import { EmptyState } from "@/components/common/empty-state";
import { Stagger, StaggerItem } from "@/components/common/motion";
import { StatTile } from "@/components/common/stat-tile";
import { BudgetCard, budgetTone } from "@/components/budget/budget-card";
import { ArrowUpRight, PiggyBank, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { deleteBudget, updateBudget, upsertBudget } from "@/lib/actions/budgets";
import { CATEGORY_ICON_NAMES } from "@/lib/constants/category-icons";
import {
  formatErrorMessage,
  getMonthLabelsFull,
} from "@/lib/i18n/translate";
import type { Category } from "@/lib/schemas/category";
import { centsToEuroString, toCents } from "@/lib/utils/money";
import { useI18n } from "@/providers/i18n-provider";
import { useConfirm } from "@/providers/confirm-provider";

const NO_CATEGORY = "none";
const DEFAULT_BUDGET_ICON = "piggy-bank";
/** Accent for tag-only budgets (no category colour available). */
const TAG_COLOR = "var(--primary)";

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
}: {
  items: BudgetItem[];
  categories: Category[];
  availableTags: string[];
  year: number;
  month: number;
  currency: string;
  locale: string;
}) {
  const { t, language } = useI18n();
  const confirm = useConfirm();
  const monthLabelsFull = getMonthLabelsFull(language);
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
        toast.success(t("budget.updated"));
      } else {
        await upsertBudget(payload);
        toast.success(t("budget.saved"));
      }
      setOpen(false);
      resetForm();
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ title: t("budget.deleteConfirm"), description: t("common.cannotUndo"), confirmLabel: t("common.delete") }))) return;
    try {
      await deleteBudget(id);
      toast.success(t("budget.deleted"));
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("budget.title")}
        description={t("budget.description", {
          month: monthLabelsFull[month - 1],
          year,
        })}
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="size-4" />
            {t("budget.new")}
          </Button>
        }
      />

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <StatTile label={t("budget.activeCount")} icon={PiggyBank} tone="primary" value={items.length} />
          <StatTile
            label={t("budget.spentMonth")}
            icon={ArrowUpRight}
            tone={totals.limit > 0 ? budgetTone(totals.spent / totals.limit) : "neutral"}
            value={<Amount cents={totals.spent} currency={currency} animated />}
          />
          <StatTile
            label={t("budget.totalLimit")}
            icon={Target}
            tone="neutral"
            value={<Amount cents={totals.limit} currency={currency} />}
          />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title={t("budget.emptyTitle")}
          description={t("budget.emptyDescription")}
          action={
            <Button onClick={openCreateDialog}>
              <Plus />
              {t("budget.new")}
            </Button>
          }
        />
      ) : (
        <Stagger className="grid gap-4 lg:grid-cols-2">
          {items.map((item, index) => (
            <StaggerItem key={item.id}>
              <BudgetCard
                item={item}
                index={index}
                currency={currency}
                accentColor={item.categoryId ? item.categoryColor : TAG_COLOR}
                onEdit={() => openEditDialog(item)}
                onDelete={() => handleDelete(item.id)}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Sheet open={open} onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {editingBudget ? t("budget.edit") : t("budget.new")}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="budget-name">{t("budget.name")}</Label>
              <Input
                id="budget-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("budget.namePlaceholder")}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("common.category")}</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("common.optional")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>{t("budget.noCategory")}</SelectItem>
                    {expenseCategories.map((c) => (
                      <CategorySelectItem key={c.id} category={c} />
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget-tag">{t("budget.singleTag")}</Label>
                <TagSingleInput
                  id="budget-tag"
                  value={tag}
                  onChange={setTag}
                  suggestions={availableTags}
                  placeholder={t("labels.tags.example")}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("common.icon")}</Label>
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
                <Label htmlFor="limit">{t("budget.monthlyLimit")}</Label>
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
              {duplicateBudget ? t("budget.duplicateHint") : t("budget.scopeHint")}
            </div>

            <SheetFooter>
              <Button type="submit" disabled={!canSubmit}>
                {editingBudget ? t("common.update") : t("common.save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function getBudgetKey(categoryId?: string, tag?: string): string {
  if (!categoryId && !tag) return "";
  return `${categoryId ?? ""}::${tag?.trim().toLowerCase() ?? ""}`;
}
