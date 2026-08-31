"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronDown,
  CirclePlus,
  Landmark,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  addAccumulationPlanOneTimeContribution,
  createAccumulationPlan,
  deleteAccumulationPlan,
  removeAccumulationPlanOneTimeContribution,
  updateAccumulationPlan,
} from "@/lib/actions/accumulation-plans";
import {
  addStockPurchase,
  createStockHolding,
  deleteStockHolding,
  removeStockPurchase,
  updateStockHolding,
} from "@/lib/actions/stock-holdings";
import type { Account } from "@/lib/schemas/account";
import type { AccumulationPlan } from "@/lib/schemas/accumulation-plan";
import type { StockHolding, StockPurchase } from "@/lib/schemas/stock-holding";
import type { AccumulationContribution } from "@/lib/utils/accumulation";
import { formatErrorMessage } from "@/lib/i18n/translate";
import {
  formatQuantity,
  parseQuantity,
  toCents,
} from "@/lib/utils/money";
import { formatDate, todayISO } from "@/lib/utils/dates";
import { useFormatCents } from "@/hooks/use-format-cents";
import { useI18n } from "@/providers/i18n-provider";

export type PlanListItem = AccumulationPlan & {
  lifetimeBalance: number;
  yearBalance: number;
  posted: AccumulationContribution[];
};

export type StockListItem = StockHolding & {
  invested: number;
  quantity: number;
  averagePriceCents: number;
  yearInvested: number;
  posted: AccumulationContribution[];
};

export function PlansView({
  items,
  holdings,
  accounts,
  year,
  currency,
  locale,
}: {
  items: PlanListItem[];
  holdings: StockListItem[];
  accounts: Account[];
  year: number;
  currency: string;
  locale: string;
}) {
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlanListItem | null>(null);
  const [addingOneTime, setAddingOneTime] = useState<PlanListItem | null>(null);
  const [name, setName] = useState("");
  const [oneTimeAmountEuro, setOneTimeAmountEuro] = useState("");
  const [oneTimeAccountId, setOneTimeAccountId] = useState("");
  const [oneTimeDate, setOneTimeDate] = useState(todayISO);

  const [stockOpen, setStockOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<StockListItem | null>(null);
  const [addingPurchase, setAddingPurchase] = useState<StockListItem | null>(
    null
  );
  const [stockName, setStockName] = useState("");
  const [purchaseAmountEuro, setPurchaseAmountEuro] = useState("");
  const [purchaseQuantity, setPurchaseQuantity] = useState("");
  const [purchaseAccountId, setPurchaseAccountId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO);

  const canSubmit = !!name.trim();
  const canSubmitOneTime =
    addingOneTime != null &&
    toCents(oneTimeAmountEuro) > 0 &&
    !!oneTimeAccountId &&
    !!oneTimeDate;
  const canSubmitStock = !!stockName.trim();
  const canSubmitPurchase =
    addingPurchase != null &&
    toCents(purchaseAmountEuro) > 0 &&
    parseQuantity(purchaseQuantity) > 0 &&
    !!purchaseAccountId &&
    !!purchaseDate;

  function resetForm() {
    setEditing(null);
    setName("");
  }

  function resetOneTimeForm() {
    setAddingOneTime(null);
    setOneTimeAmountEuro("");
    setOneTimeAccountId("");
    setOneTimeDate(todayISO());
  }

  function resetStockForm() {
    setEditingStock(null);
    setStockName("");
  }

  function resetPurchaseForm() {
    setAddingPurchase(null);
    setPurchaseAmountEuro("");
    setPurchaseQuantity("");
    setPurchaseAccountId("");
    setPurchaseDate(todayISO());
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(item: PlanListItem) {
    setEditing(item);
    setName(item.name);
    setOpen(true);
  }

  function openOneTime(item: PlanListItem) {
    setAddingOneTime(item);
    setOneTimeAmountEuro("");
    setOneTimeAccountId(accounts[0]?.id ?? "");
    setOneTimeDate(todayISO());
  }

  function openCreateStock() {
    resetStockForm();
    setStockOpen(true);
  }

  function openEditStock(item: StockListItem) {
    setEditingStock(item);
    setStockName(item.name);
    setStockOpen(true);
  }

  function openPurchase(item: StockListItem) {
    setAddingPurchase(item);
    setPurchaseAmountEuro("");
    setPurchaseQuantity("");
    setPurchaseAccountId(accounts[0]?.id ?? "");
    setPurchaseDate(todayISO());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const payload = { name: name.trim() };
    try {
      if (editing) {
        await updateAccumulationPlan(editing.id, payload);
        toast.success(t("plans.updated"));
      } else {
        await createAccumulationPlan(payload);
        toast.success(t("plans.created"));
      }
      setOpen(false);
      resetForm();
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  async function handleAddOneTime(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitOneTime || !addingOneTime) return;
    try {
      await addAccumulationPlanOneTimeContribution(addingOneTime.id, {
        amount: toCents(oneTimeAmountEuro),
        date: oneTimeDate,
        sourceAccountId: oneTimeAccountId,
      });
      toast.success(t("plans.oneTimeAdded"));
      setOneTimeAmountEuro("");
      setOneTimeDate(todayISO());
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  async function handleRemoveOneTime(planId: string, contributionId: string) {
    if (!confirm(t("plans.oneTimeRemoveConfirm"))) return;
    try {
      await removeAccumulationPlanOneTimeContribution(planId, contributionId);
      toast.success(t("plans.oneTimeRemoved"));
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("plans.deleteConfirm"))) return;
    try {
      await deleteAccumulationPlan(id);
      toast.success(t("plans.deleted"));
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  async function handleStockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitStock) return;
    const payload = { name: stockName.trim() };
    try {
      if (editingStock) {
        await updateStockHolding(editingStock.id, payload);
        toast.success(t("plans.stocksUpdated"));
      } else {
        await createStockHolding(payload);
        toast.success(t("plans.stocksCreated"));
      }
      setStockOpen(false);
      resetStockForm();
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  async function handleAddPurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitPurchase || !addingPurchase) return;
    try {
      await addStockPurchase(addingPurchase.id, {
        amount: toCents(purchaseAmountEuro),
        quantity: parseQuantity(purchaseQuantity),
        date: purchaseDate,
        sourceAccountId: purchaseAccountId,
      });
      toast.success(t("plans.stocksPurchaseAdded"));
      setPurchaseAmountEuro("");
      setPurchaseQuantity("");
      setPurchaseDate(todayISO());
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  async function handleRemovePurchase(holdingId: string, purchaseId: string) {
    if (!confirm(t("plans.stocksPurchaseRemoveConfirm"))) return;
    try {
      await removeStockPurchase(holdingId, purchaseId);
      toast.success(t("plans.stocksPurchaseRemoved"));
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  async function handleDeleteStock(id: string) {
    if (!confirm(t("plans.stocksDeleteConfirm"))) return;
    try {
      await deleteStockHolding(id);
      toast.success(t("plans.stocksDeleted"));
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  const addingLive = addingOneTime
    ? items.find((item) => item.id === addingOneTime.id)
    : undefined;
  const oneTimeHistory = [...(addingLive?.oneTimeContributions ?? [])].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  );
  const addingPurchaseLive = addingPurchase
    ? holdings.find((item) => item.id === addingPurchase.id)
    : undefined;
  const purchaseHistory = [...(addingPurchaseLive?.purchases ?? [])].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("plans.title")}
        description={t("plans.description")}
      />

      {accounts.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-10 text-center">
            <p className="mb-4 text-muted-foreground">{t("plans.needAccount")}</p>
            <Button asChild>
              <Link href={`/accounts?year=${year}`}>{t("plans.goToAccounts")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="space-y-4">
            <SectionHeader
              title={t("plans.indexesSection")}
              actionLabel={t("plans.new")}
              onAction={openCreate}
            />
            {items.length === 0 ? (
              <EmptyState
                icon={Landmark}
                title={t("plans.emptyTitle")}
                description={t("plans.emptyDescription")}
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {items.map((item) => (
                  <PlanCard
                    key={item.id}
                    item={item}
                    year={year}
                    currency={currency}
                    locale={locale}
                    onEdit={openEdit}
                    onAddOneTime={openOneTime}
                    onRemoveOneTime={handleRemoveOneTime}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <SectionHeader
              title={t("plans.stocksSection")}
              actionLabel={t("plans.stocksNew")}
              onAction={openCreateStock}
            />
            {holdings.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title={t("plans.stocksEmptyTitle")}
                description={t("plans.stocksEmptyDescription")}
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {holdings.map((item) => (
                  <StockCard
                    key={item.id}
                    item={item}
                    year={year}
                    currency={currency}
                    locale={locale}
                    onEdit={openEditStock}
                    onAddPurchase={openPurchase}
                    onRemovePurchase={handleRemovePurchase}
                    onDelete={handleDeleteStock}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetForm();
        }}
      >
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {editing ? t("plans.edit") : t("plans.new")}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">{t("common.name")}</Label>
              <Input
                id="plan-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("plans.namePlaceholder")}
              />
            </div>
            <SheetFooter>
              <Button type="submit" disabled={!canSubmit}>
                {editing ? t("common.update") : t("common.save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={addingOneTime != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) resetOneTimeForm();
        }}
      >
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t("plans.oneTime")}</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={handleAddOneTime}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <div className="space-y-2">
              <Label htmlFor="plan-one-time-amount">{t("plans.amount")}</Label>
              <Input
                id="plan-one-time-amount"
                inputMode="decimal"
                value={oneTimeAmountEuro}
                onChange={(e) => setOneTimeAmountEuro(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <AccountSelect
              value={oneTimeAccountId}
              onChange={setOneTimeAccountId}
              accounts={accounts}
            />
            <div className="space-y-2">
              <Label htmlFor="plan-one-time-date">{t("common.date")}</Label>
              <Input
                id="plan-one-time-date"
                type="date"
                value={oneTimeDate}
                onChange={(e) => setOneTimeDate(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("plans.oneTimeHint")}
            </p>
            {oneTimeHistory.length > 0 && addingOneTime ? (
              <OneTimeHistoryList
                planId={addingOneTime.id}
                extras={oneTimeHistory}
                accounts={accounts}
                currency={currency}
                locale={locale}
                language={language}
                onRemove={handleRemoveOneTime}
              />
            ) : null}
            <SheetFooter>
              <Button type="submit" disabled={!canSubmitOneTime}>
                {t("common.save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={stockOpen}
        onOpenChange={(nextOpen) => {
          setStockOpen(nextOpen);
          if (!nextOpen) resetStockForm();
        }}
      >
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {editingStock ? t("plans.stocksEdit") : t("plans.stocksNew")}
            </SheetTitle>
          </SheetHeader>
          <form
            onSubmit={handleStockSubmit}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <div className="space-y-2">
              <Label htmlFor="stock-name">{t("common.name")}</Label>
              <Input
                id="stock-name"
                value={stockName}
                onChange={(e) => setStockName(e.target.value)}
                placeholder={t("plans.stocksNamePlaceholder")}
              />
            </div>
            <SheetFooter>
              <Button type="submit" disabled={!canSubmitStock}>
                {editingStock ? t("common.update") : t("common.save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={addingPurchase != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) resetPurchaseForm();
        }}
      >
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t("plans.stocksPurchase")}</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={handleAddPurchase}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <div className="space-y-2">
              <Label htmlFor="stock-purchase-amount">{t("plans.amount")}</Label>
              <Input
                id="stock-purchase-amount"
                inputMode="decimal"
                value={purchaseAmountEuro}
                onChange={(e) => setPurchaseAmountEuro(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-purchase-qty">
                {t("plans.stocksQuantity")}
              </Label>
              <Input
                id="stock-purchase-qty"
                inputMode="decimal"
                value={purchaseQuantity}
                onChange={(e) => setPurchaseQuantity(e.target.value)}
                placeholder={t("plans.stocksQuantityPlaceholder")}
              />
            </div>
            <AccountSelect
              value={purchaseAccountId}
              onChange={setPurchaseAccountId}
              accounts={accounts}
            />
            <div className="space-y-2">
              <Label htmlFor="stock-purchase-date">{t("common.date")}</Label>
              <Input
                id="stock-purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("plans.stocksPurchaseHint")}
            </p>
            {purchaseHistory.length > 0 && addingPurchase ? (
              <PurchaseHistoryList
                holdingId={addingPurchase.id}
                purchases={purchaseHistory}
                accounts={accounts}
                currency={currency}
                locale={locale}
                language={language}
                onRemove={handleRemovePurchase}
              />
            ) : null}
            <SheetFooter>
              <Button type="submit" disabled={!canSubmitPurchase}>
                {t("common.save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <Button onClick={onAction}>
        <Plus className="size-4" />
        {actionLabel}
      </Button>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Landmark;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium">{title}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function AccountSelect({
  value,
  onChange,
  accounts,
}: {
  value: string;
  onChange: (value: string) => void;
  accounts: Account[];
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <Label>{t("plans.sourceAccount")}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={t("plans.selectAccount")} />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PlanCard({
  item,
  year,
  currency,
  locale,
  onEdit,
  onAddOneTime,
  onRemoveOneTime,
  onDelete,
}: {
  item: PlanListItem;
  year: number;
  currency: string;
  locale: string;
  onEdit: (item: PlanListItem) => void;
  onAddOneTime: (item: PlanListItem) => void;
  onRemoveOneTime: (planId: string, contributionId: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t, language } = useI18n();
  const formatAmount = useFormatCents();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-base">{item.name}</CardTitle>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("plans.editAria", { name: item.name })}
            onClick={() => onEdit(item)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("plans.deleteAria", { name: item.name })}
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">{t("plans.accumulated")}</p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatAmount(item.lifetimeBalance, currency, locale)}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("plans.accumulatedYear", { year })}:{" "}
            {formatAmount(item.yearBalance, currency, locale)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("plans.oneTimeAria", { name: item.name })}
          onClick={() => onAddOneTime(item)}
        >
          <CirclePlus className="size-3.5" />
          {t("plans.oneTime")}
        </Button>
        <ContributionList
          title={t("plans.posted")}
          items={item.posted}
          currency={currency}
          locale={locale}
          language={language}
          emptyLabel={t("plans.noneThisYear")}
          onRemove={(contributionId) => onRemoveOneTime(item.id, contributionId)}
        />
      </CardContent>
    </Card>
  );
}

function StockCard({
  item,
  year,
  currency,
  locale,
  onEdit,
  onAddPurchase,
  onRemovePurchase,
  onDelete,
}: {
  item: StockListItem;
  year: number;
  currency: string;
  locale: string;
  onEdit: (item: StockListItem) => void;
  onAddPurchase: (item: StockListItem) => void;
  onRemovePurchase: (holdingId: string, purchaseId: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t, language } = useI18n();
  const formatAmount = useFormatCents();
  const purchaseById = Object.fromEntries(
    (item.purchases ?? []).map((purchase) => [purchase.id, purchase])
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-base">{item.name}</CardTitle>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("plans.stocksEditAria", { name: item.name })}
            onClick={() => onEdit(item)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("plans.stocksDeleteAria", { name: item.name })}
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">{t("plans.stocksInvested")}</p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatAmount(item.invested, currency, locale)}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("plans.stocksShares")}: {formatQuantity(item.quantity, locale)}
            {item.quantity > 0
              ? ` · ${t("plans.stocksAveragePrice")}: ${formatAmount(item.averagePriceCents, currency, locale)}`
              : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("plans.accumulatedYear", { year })}:{" "}
            {formatAmount(item.yearInvested, currency, locale)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("plans.stocksPurchaseAria", { name: item.name })}
          onClick={() => onAddPurchase(item)}
        >
          <CirclePlus className="size-3.5" />
          {t("plans.stocksPurchase")}
        </Button>
        <ContributionList
          title={t("plans.stocksPosted")}
          items={item.posted}
          currency={currency}
          locale={locale}
          language={language}
          emptyLabel={t("plans.stocksNoneThisYear")}
          quantityOf={(id) => purchaseById[id]?.quantity}
          onRemove={(purchaseId) => onRemovePurchase(item.id, purchaseId)}
        />
      </CardContent>
    </Card>
  );
}

function OneTimeHistoryList({
  planId,
  extras,
  accounts,
  currency,
  locale,
  language,
  onRemove,
}: {
  planId: string;
  extras: AccumulationPlan["oneTimeContributions"];
  accounts: Account[];
  currency: string;
  locale: string;
  language: "it" | "en";
  onRemove: (planId: string, contributionId: string) => void;
}) {
  const { t } = useI18n();
  const formatAmount = useFormatCents();
  const accountName = (id: string) =>
    accounts.find((account) => account.id === id)?.name ?? id;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("plans.oneTimeHistory")}</p>
      <ul className="divide-y text-sm">
        {extras.map((extra) => (
          <li
            key={extra.id}
            className="flex items-center justify-between gap-2 py-1.5"
          >
            <span className="text-muted-foreground">
              {formatDate(extra.date, "dd/MM/yyyy", language)} ·{" "}
              {accountName(extra.sourceAccountId)}
            </span>
            <span className="flex items-center gap-1">
              <span className="tabular-nums">
                {formatAmount(extra.amount, currency, locale)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("plans.removeOneTimeAria", {
                  date: formatDate(extra.date, "dd/MM/yyyy", language),
                })}
                onClick={() => onRemove(planId, extra.id)}
              >
                <X className="size-3.5" />
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PurchaseHistoryList({
  holdingId,
  purchases,
  accounts,
  currency,
  locale,
  language,
  onRemove,
}: {
  holdingId: string;
  purchases: StockPurchase[];
  accounts: Account[];
  currency: string;
  locale: string;
  language: "it" | "en";
  onRemove: (holdingId: string, purchaseId: string) => void;
}) {
  const { t } = useI18n();
  const formatAmount = useFormatCents();
  const accountName = (id: string) =>
    accounts.find((account) => account.id === id)?.name ?? id;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("plans.stocksPurchaseHistory")}</p>
      <ul className="divide-y text-sm">
        {purchases.map((purchase) => (
          <li
            key={purchase.id}
            className="flex items-center justify-between gap-2 py-1.5"
          >
            <span className="text-muted-foreground">
              {formatDate(purchase.date, "dd/MM/yyyy", language)} ·{" "}
              {accountName(purchase.sourceAccountId)} ·{" "}
              {formatQuantity(purchase.quantity, locale)}
            </span>
            <span className="flex items-center gap-1">
              <span className="tabular-nums">
                {formatAmount(purchase.amount, currency, locale)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("plans.stocksRemovePurchaseAria", {
                  date: formatDate(purchase.date, "dd/MM/yyyy", language),
                })}
                onClick={() => onRemove(holdingId, purchase.id)}
              >
                <X className="size-3.5" />
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContributionList({
  title,
  items,
  currency,
  locale,
  language,
  emptyLabel,
  quantityOf,
  onRemove,
}: {
  title: string;
  items: AccumulationContribution[];
  currency: string;
  locale: string;
  language: "it" | "en";
  emptyLabel: string;
  quantityOf?: (id: string) => number | undefined;
  onRemove: (contributionId: string) => void;
}) {
  const { t } = useI18n();
  const formatAmount = useFormatCents();

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg py-1 text-sm font-medium hover:text-foreground">
        <span>
          {title} ({items.length})
        </span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {items.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="divide-y text-sm">
            {items.map((item) => {
              const quantity = quantityOf?.(item.occurrenceId);
              return (
                <li
                  key={item.occurrenceId}
                  className="flex items-center justify-between gap-2 py-1.5"
                >
                  <span className="text-muted-foreground">
                    {formatDate(item.date, "dd/MM/yyyy", language)}
                    {quantity != null
                      ? ` · ${formatQuantity(quantity, locale)}`
                      : null}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="tabular-nums">
                      {formatAmount(item.amount, currency, locale)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("plans.removeOneTimeAria", {
                        date: formatDate(item.date, "dd/MM/yyyy", language),
                      })}
                      onClick={() => onRemove(item.occurrenceId)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
