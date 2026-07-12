"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowLeftRight,
  Calendar,
  CirclePlus,
  Euro,
  FileText,
  Receipt,
  Repeat,
  Tag,
  Tags,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { AccountIcon } from "@/components/accounts/account-icon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CategorySelectItem } from "@/components/categories/category-select-item";
import { TagInput } from "@/components/tags/tag-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import { TRANSACTION_FORM_TYPES } from "@/lib/constants";
import type { Account } from "@/lib/schemas/account";
import type { Category } from "@/lib/schemas/category";
import type { Transaction } from "@/lib/schemas/transaction";
import { useI18n } from "@/providers/i18n-provider";
import { formatErrorMessage } from "@/lib/i18n/translate";
import { todayISO } from "@/lib/utils/dates";
import { toCents } from "@/lib/utils/money";
import { dedupeTags } from "@/lib/utils/tags";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<(typeof TRANSACTION_FORM_TYPES)[number], LucideIcon> = {
  income: TrendingUp,
  expense: TrendingDown,
};

type FormValues = {
  date: string;
  amountEuro: string;
  type: (typeof TRANSACTION_FORM_TYPES)[number];
  categoryId?: string;
  accountId: string;
  notes: string;
  tags: string[];
  isRecurring: boolean;
  recurrenceStart?: string;
  recurrenceEnd?: string;
};

type TransactionFormProps = {
  accounts: Account[];
  categories: Category[];
  availableTags?: string[];
  year: number;
  transaction?: Transaction;
  onSuccess?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  compact?: boolean;
};

function FieldLabel({
  htmlFor,
  icon: Icon,
  children,
}: {
  htmlFor?: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-1.5">
      <Icon className="size-3.5 text-muted-foreground" />
      {children}
    </Label>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <Icon className="size-4" />
      {children}
    </h3>
  );
}

export function TransactionForm({
  accounts,
  categories,
  availableTags = [],
  year,
  transaction,
  onSuccess,
  onCancel,
  confirmLabel,
  compact = false,
}: TransactionFormProps) {
  const { t, language } = useI18n();
  const isEdit = !!transaction;
  const isLegacyTransfer = transaction?.type === "transfer";

  const formSchema = useMemo(
    () =>
      z
        .object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          amountEuro: z.string().min(1, t("transactions.form.amountRequired")),
          type: z.enum(TRANSACTION_FORM_TYPES),
          categoryId: z.string().optional(),
          accountId: z.string().min(1),
          notes: z.string(),
          tags: z.array(z.string()),
          isRecurring: z.boolean(),
          recurrenceStart: z.string().optional(),
          recurrenceEnd: z.string().optional(),
        })
        .superRefine((data, ctx) => {
          if (!data.categoryId) {
            ctx.addIssue({
              code: "custom",
              message: t("transactions.form.selectCategory"),
              path: ["categoryId"],
            });
          }
          if (toCents(data.amountEuro) <= 0) {
            ctx.addIssue({
              code: "custom",
              message: t("transactions.form.amountPositive"),
              path: ["amountEuro"],
            });
          }
        }),
    [t]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: transaction?.date ?? todayISO(),
      amountEuro: transaction
        ? (transaction.amount / 100).toFixed(2)
        : "",
      type: transaction?.type === "transfer" ? "expense" : (transaction?.type ?? "expense"),
      categoryId: transaction?.categoryId ?? undefined,
      accountId: transaction?.accountId ?? accounts[0]?.id ?? "",
      notes: transaction?.notes ?? "",
      tags: transaction?.tags ?? [],
      isRecurring: transaction?.isRecurring ?? false,
      recurrenceStart: transaction?.recurrenceStart ?? "",
      recurrenceEnd: transaction?.recurrenceEnd ?? "",
    },
  });

  const watchType = form.watch("type");
  const watchRecurring = form.watch("isRecurring");

  if (isLegacyTransfer) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        {t("transactions.transferManagedInAccounts")}{" "}
        <Link href={`/accounts?year=${year}`} className="font-medium text-primary underline">
          {t("nav.accounts")}
        </Link>
        .
      </div>
    );
  }

  const filteredCategories = categories.filter((c) => {
    if (watchType === "income") return c.type === "income";
    if (watchType === "expense") return c.type === "expense";
    return true;
  });

  async function onSubmit(values: FormValues) {
    const payload = {
      date: values.date,
      amount: toCents(values.amountEuro),
      type: values.type,
      categoryId: values.categoryId ?? null,
      accountId: values.accountId,
      notes: values.notes,
      tags: dedupeTags(values.tags),
      isRecurring: values.isRecurring,
      recurrenceStart:
        values.isRecurring && values.recurrenceStart
          ? values.recurrenceStart
          : undefined,
      recurrenceEnd:
        values.isRecurring && values.recurrenceEnd
          ? values.recurrenceEnd
          : undefined,
    };

    try {
      if (isEdit && transaction) {
        await updateTransaction(transaction.id, year, payload);
        toast.success(t("transactions.updated"));
      } else {
        await createTransaction(payload);
        toast.success(t("transactions.saved"));
        form.reset({
          date: todayISO(),
          amountEuro: "",
          type: "expense",
          categoryId: undefined,
          accountId: accounts[0]?.id ?? "",
          notes: "",
          tags: [],
          isRecurring: false,
          recurrenceStart: "",
          recurrenceEnd: "",
        });
      }
      onSuccess?.();
    } catch (err) {
      toast.error(formatErrorMessage(language, err, "common.errorSaving"));
    }
  }

  const formBody = (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Type segmented control */}
            <div className="space-y-2 md:col-span-2">
              <FieldLabel icon={ArrowLeftRight}>{t("common.type")}</FieldLabel>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted p-1">
                {TRANSACTION_FORM_TYPES.map((txType) => {
                  const Icon = TYPE_ICONS[txType];
                  const active = watchType === txType;
                  const activeTone =
                    txType === "income" ? "text-success" : "text-danger";
                  return (
                    <button
                      key={txType}
                      type="button"
                      onClick={() => {
                        form.setValue("type", txType);
                        form.setValue("categoryId", undefined);
                      }}
                      aria-pressed={active}
                      className={cn(
                        "flex h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all md:h-9",
                        active
                          ? `bg-card shadow-sm ring-1 ring-foreground/10 ${activeTone}`
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                      <span className="hidden sm:inline">
                        {t(`labels.transactionType.${txType}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <FieldLabel htmlFor="amount" icon={Euro}>
                {t("transactions.form.amountEuro")}
              </FieldLabel>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder={t("transactions.form.amountPlaceholder")}
                className="h-14 text-2xl font-semibold tabular-nums md:h-14"
                {...form.register("amountEuro")}
              />
              {form.formState.errors.amountEuro && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.amountEuro.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="date" icon={Calendar}>{t("common.date")}</FieldLabel>
              <Input id="date" type="date" {...form.register("date")} />
            </div>

            <div className="space-y-2">
              <FieldLabel icon={Tags}>{t("common.category")}</FieldLabel>
              {filteredCategories.length === 0 ? (
                <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  {t("transactions.form.noCategoryForType")}{" "}
                  <Link href="/categories" className="font-medium text-primary underline">
                    {t("transactions.form.addCategoryLink")}
                  </Link>
                </div>
              ) : (
                <>
                  <Select
                    value={form.watch("categoryId") ?? ""}
                    onValueChange={(v) => form.setValue("categoryId", v)}
                  >
                    <SelectTrigger className="w-full" aria-invalid={!!form.formState.errors.categoryId}>
                      <SelectValue placeholder={t("transactions.form.selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((c) => (
                        <CategorySelectItem key={c.id} category={c} />
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.categoryId && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.categoryId.message}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <FieldLabel icon={Wallet}>{t("common.account")}</FieldLabel>
              <Select
                value={form.watch("accountId")}
                onValueChange={(v) => form.setValue("accountId", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("transactions.form.selectAccount")} />
                </SelectTrigger>
                <SelectContent>
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

            <div className="space-y-2">
              <FieldLabel htmlFor="notes" icon={FileText}>{t("common.notes")}</FieldLabel>
              <Textarea id="notes" rows={3} {...form.register("notes")} />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="tags" icon={Tag}>{t("common.tags")}</FieldLabel>
              <Controller
                name="tags"
                control={form.control}
                render={({ field }) => (
                  <TagInput
                    id="tags"
                    value={field.value}
                    onChange={field.onChange}
                    suggestions={availableTags}
                    placeholder={t("transactions.form.tagsPlaceholder")}
                  />
                )}
              />
            </div>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
            <SectionTitle icon={Repeat}>{t("transactions.form.recurrence")}</SectionTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                id="recurring"
                checked={watchRecurring}
                onCheckedChange={(checked) => {
                  const isRecurring = checked === true;
                  form.setValue("isRecurring", isRecurring);
                  if (isRecurring && !form.getValues("recurrenceStart")) {
                    form.setValue("recurrenceStart", form.getValues("date"));
                  }
                }}
              />
              <Label htmlFor="recurring">{t("transactions.form.recurringMonthly")}</Label>
            </div>

            {watchRecurring && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="recurrenceStart" icon={Calendar}>
                      {t("transactions.form.recurrenceStart")}
                    </FieldLabel>
                    <Input
                      id="recurrenceStart"
                      type="date"
                      {...form.register("recurrenceStart")}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="recurrenceEnd" icon={Calendar}>
                      {t("transactions.form.recurrenceEnd")}
                    </FieldLabel>
                    <Input
                      id="recurrenceEnd"
                      type="date"
                      {...form.register("recurrenceEnd")}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("transactions.form.recurrenceNoEndHint")}
                </p>
              </div>
            )}
          </div>

          {onCancel ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:flex-1"
                onClick={onCancel}
                disabled={form.formState.isSubmitting}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                className="w-full sm:flex-1"
                disabled={form.formState.isSubmitting}
              >
                {confirmLabel ?? (isEdit ? t("transactions.form.update") : t("transactions.form.save"))}
              </Button>
            </div>
          ) : (
            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={form.formState.isSubmitting}
            >
              {isEdit ? t("transactions.form.update") : t("transactions.form.save")}
            </Button>
          )}
        </form>
  );

  if (compact) {
    return formBody;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {isEdit ? (
              <Receipt className="size-5" />
            ) : (
              <CirclePlus className="size-5" />
            )}
          </div>
          <CardTitle className="text-lg">
            {isEdit ? t("transactions.editTitle") : t("transactions.form.newTitle")}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>{formBody}</CardContent>
    </Card>
  );
}
