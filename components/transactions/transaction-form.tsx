"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/lib/toast";
import { z } from "zod";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AccountPicker, CategoryPicker, TypeToggle } from "@/components/transactions/form-pickers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/tags/tag-input";
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

  const idSuffix = transaction?.id ?? "new";
  const watchType = form.watch("type");
  const watchRecurring = form.watch("isRecurring");

  if (isLegacyTransfer) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
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
        // Keep date and account so back-dated entries can be added in a row.
        form.reset({
          date: values.date,
          amountEuro: "",
          type: "expense",
          categoryId: undefined,
          accountId: values.accountId,
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <TypeToggle
        value={watchType}
        idPrefix={transaction?.id ?? "new"}
        onChange={(type) => {
          form.setValue("type", type);
          form.setValue("categoryId", undefined);
        }}
      />

      {/* Amount: the hero of the form */}
      <div className="text-center">
        <Label htmlFor={`amount-${idSuffix}`} className="sr-only">
          {t("transactions.form.amountEuro")}
        </Label>
        <div
          className={cn(
            "mx-auto flex max-w-xs items-baseline justify-center gap-1 border-b-2 pb-1 transition-colors focus-within:border-primary",
            form.formState.errors.amountEuro ? "border-destructive" : "border-border"
          )}
        >
          <span className="text-2xl font-semibold text-muted-foreground" aria-hidden="true">
            €
          </span>
          <input
            id={`amount-${idSuffix}`}
            inputMode="decimal"
            autoComplete="off"
            autoFocus={!isEdit && !compact}
            placeholder={t("transactions.form.amountPlaceholder")}
            aria-invalid={!!form.formState.errors.amountEuro}
            className="w-full min-w-0 bg-transparent text-center text-[2.5rem] leading-tight font-bold tracking-[-0.03em] tabular-nums outline-none placeholder:text-muted-foreground/50"
            {...form.register("amountEuro")}
          />
        </div>
        {form.formState.errors.amountEuro && (
          <p role="alert" className="mt-1.5 text-xs text-destructive">
            {form.formState.errors.amountEuro.message}
          </p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <p id={`category-label-${idSuffix}`} className="text-sm font-semibold">
          {t("common.category")}
        </p>
        {filteredCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
            {t("transactions.form.noCategoryForType")}{" "}
            <Link href="/categories" className="font-semibold text-primary underline">
              {t("transactions.form.addCategoryLink")}
            </Link>
          </div>
        ) : (
          <CategoryPicker
            categories={filteredCategories}
            value={form.watch("categoryId")}
            onChange={(id) => form.setValue("categoryId", id, { shouldValidate: form.formState.isSubmitted })}
            invalid={!!form.formState.errors.categoryId}
            labelledBy={`category-label-${idSuffix}`}
          />
        )}
        {form.formState.errors.categoryId && (
          <p role="alert" className="text-xs text-destructive">
            {form.formState.errors.categoryId.message}
          </p>
        )}
      </div>

      {/* Account */}
      <div className="space-y-2">
        <p id={`account-label-${idSuffix}`} className="text-sm font-semibold">
          {t("common.account")}
        </p>
        <AccountPicker
          accounts={accounts}
          value={form.watch("accountId")}
          onChange={(id) => form.setValue("accountId", id)}
          labelledBy={`account-label-${idSuffix}`}
        />
      </div>

      {/* Details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`notes-${idSuffix}`}>{t("common.notes")}</Label>
          <Input
            id={`notes-${idSuffix}`}
            placeholder={t("transactions.form.notesPlaceholder")}
            {...form.register("notes")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`date-${idSuffix}`}>{t("common.date")}</Label>
          <Input id={`date-${idSuffix}`} type="date" {...form.register("date")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`tags-${idSuffix}`}>{t("common.tags")}</Label>
          <Controller
            name="tags"
            control={form.control}
            render={({ field }) => (
              <TagInput
                id={`tags-${idSuffix}`}
                value={field.value}
                onChange={field.onChange}
                suggestions={availableTags}
                placeholder={t("transactions.form.tagsPlaceholder")}
              />
            )}
          />
        </div>
      </div>

      {/* Recurrence */}
      <div className="rounded-xl border border-border">
        <label
          htmlFor={`recurring-${idSuffix}`}
          className="flex cursor-pointer items-center gap-3 px-4 py-3"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground" aria-hidden="true">
            <Repeat className="size-4" />
          </span>
          <span className="flex-1 text-sm font-semibold">{t("transactions.form.recurringMonthly")}</span>
          <Switch
            id={`recurring-${idSuffix}`}
            checked={watchRecurring}
            onCheckedChange={(checked) => {
              form.setValue("isRecurring", checked);
              if (checked && !form.getValues("recurrenceStart")) {
                form.setValue("recurrenceStart", form.getValues("date"));
              }
            }}
          />
        </label>
        {watchRecurring && (
          <div className="animate-rise space-y-3 border-t border-border px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`recurrenceStart-${idSuffix}`}>{t("transactions.form.recurrenceStart")}</Label>
                <Input id={`recurrenceStart-${idSuffix}`} type="date" {...form.register("recurrenceStart")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`recurrenceEnd-${idSuffix}`}>{t("transactions.form.recurrenceEnd")}</Label>
                <Input id={`recurrenceEnd-${idSuffix}`} type="date" {...form.register("recurrenceEnd")} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("transactions.form.recurrenceNoEndHint")}</p>
          </div>
        )}
      </div>

      {onCancel ? (
        <div className="grid grid-cols-2 gap-2.5">
          <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={form.formState.isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {confirmLabel ?? (isEdit ? t("transactions.form.update") : t("transactions.form.save"))}
          </Button>
        </div>
      ) : (
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {isEdit ? t("transactions.form.update") : t("transactions.form.save")}
        </Button>
      )}
    </form>
  );

  if (compact) {
    return formBody;
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
      {formBody}
    </div>
  );
}
