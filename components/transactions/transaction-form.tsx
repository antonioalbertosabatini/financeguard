"use client";

import Link from "next/link";
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
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPES } from "@/lib/constants";
import type { Account } from "@/lib/schemas/account";
import type { Category } from "@/lib/schemas/category";
import type { Transaction } from "@/lib/schemas/transaction";
import { todayISO } from "@/lib/utils/dates";
import { toCents } from "@/lib/utils/money";
import { dedupeTags } from "@/lib/utils/tags";

const TYPE_ICONS: Record<(typeof TRANSACTION_TYPES)[number], LucideIcon> = {
  income: TrendingUp,
  expense: TrendingDown,
  transfer: ArrowLeftRight,
};

const formSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amountEuro: z.string().min(1, "Importo obbligatorio"),
    type: z.enum(TRANSACTION_TYPES),
    categoryId: z.string().optional(),
    accountId: z.string().min(1),
    notes: z.string(),
    tags: z.array(z.string()),
    isRecurring: z.boolean(),
    recurrenceStart: z.string().optional(),
    recurrenceEnd: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "transfer" && !data.categoryId) {
      ctx.addIssue({
        code: "custom",
        message: "Seleziona una categoria",
        path: ["categoryId"],
      });
    }
    if (toCents(data.amountEuro) <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Importo deve essere positivo",
        path: ["amountEuro"],
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

type TransactionFormProps = {
  accounts: Account[];
  categories: Category[];
  availableTags?: string[];
  year: number;
  transaction?: Transaction;
  onSuccess?: () => void;
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
  compact = false,
}: TransactionFormProps) {
  const isEdit = !!transaction;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: transaction?.date ?? todayISO(),
      amountEuro: transaction
        ? (transaction.amount / 100).toFixed(2)
        : "",
      type: transaction?.type ?? "expense",
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
  const TypeIcon = TYPE_ICONS[watchType];

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
      categoryId: values.type === "transfer" ? null : values.categoryId ?? null,
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
        toast.success("Transazione aggiornata");
      } else {
        await createTransaction(payload);
        toast.success("Transazione salvata");
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
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    }
  }

  const formBody = (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel htmlFor="date" icon={Calendar}>Data</FieldLabel>
              <Input id="date" type="date" {...form.register("date")} />
            </div>

            <div className="space-y-2">
              <FieldLabel icon={ArrowLeftRight}>Tipo</FieldLabel>
              <Select
                value={watchType}
                onValueChange={(v) => {
                  form.setValue("type", v as FormValues["type"]);
                  form.setValue("categoryId", undefined);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <TypeIcon className="size-3.5" />
                      {TRANSACTION_TYPE_LABELS[watchType]}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => {
                    const Icon = TYPE_ICONS[t];
                    return (
                      <SelectItem key={t} value={t}>
                        <span className="flex items-center gap-2">
                          <Icon className="size-3.5" />
                          {TRANSACTION_TYPE_LABELS[t]}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <FieldLabel htmlFor="amount" icon={Euro}>Importo (€)</FieldLabel>
              <Input
                id="amount"
                placeholder="0.00"
                className="text-xl font-semibold tabular-nums"
                {...form.register("amountEuro")}
              />
              {form.formState.errors.amountEuro && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.amountEuro.message}
                </p>
              )}
            </div>

            {watchType !== "transfer" && (
              <div className="space-y-2">
                <FieldLabel icon={Tags}>Categoria</FieldLabel>
                {filteredCategories.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    Nessuna categoria per questo tipo.{" "}
                    <Link href="/categories" className="font-medium text-primary underline">
                      Aggiungine una
                    </Link>
                  </div>
                ) : (
                  <>
                    <Select
                      value={form.watch("categoryId") ?? ""}
                      onValueChange={(v) => form.setValue("categoryId", v)}
                    >
                      <SelectTrigger className="w-full" aria-invalid={!!form.formState.errors.categoryId}>
                        <SelectValue placeholder="Seleziona categoria" />
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
            )}

            <div className="space-y-2">
              <FieldLabel icon={Wallet}>Conto</FieldLabel>
              <Select
                value={form.watch("accountId")}
                onValueChange={(v) => form.setValue("accountId", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona conto" />
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
              <FieldLabel htmlFor="notes" icon={FileText}>Note</FieldLabel>
              <Textarea id="notes" rows={3} {...form.register("notes")} />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="tags" icon={Tag}>Tag</FieldLabel>
              <Controller
                name="tags"
                control={form.control}
                render={({ field }) => (
                  <TagInput
                    id="tags"
                    value={field.value}
                    onChange={field.onChange}
                    suggestions={availableTags}
                    placeholder="casa, lavoro…"
                  />
                )}
              />
            </div>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
            <SectionTitle icon={Repeat}>Ricorrenza</SectionTitle>
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
              <Label htmlFor="recurring">Ricorrente (mensile)</Label>
            </div>

            {watchRecurring && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="recurrenceStart" icon={Calendar}>
                      Inizio ricorrenza
                    </FieldLabel>
                    <Input
                      id="recurrenceStart"
                      type="date"
                      {...form.register("recurrenceStart")}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="recurrenceEnd" icon={Calendar}>
                      Fine ricorrenza
                    </FieldLabel>
                    <Input
                      id="recurrenceEnd"
                      type="date"
                      {...form.register("recurrenceEnd")}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se non specifichi una fine, la spesa si ripete fino a fine anno.
                </p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full md:w-auto"
            disabled={form.formState.isSubmitting}
          >
            {isEdit ? "Aggiorna transazione" : "Salva transazione"}
          </Button>
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
            {isEdit ? "Modifica transazione" : "Nuova transazione"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>{formBody}</CardContent>
    </Card>
  );
}
