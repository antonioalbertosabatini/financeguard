"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPES } from "@/lib/constants";
import type { Account } from "@/lib/schemas/account";
import type { Category } from "@/lib/schemas/category";
import type { Transaction } from "@/lib/schemas/transaction";
import { todayISO } from "@/lib/utils/dates";
import { toCents } from "@/lib/utils/money";

const formSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amountEuro: z.string().min(1, "Importo obbligatorio"),
    type: z.enum(TRANSACTION_TYPES),
    categoryId: z.string().optional(),
    accountId: z.string().min(1),
    notes: z.string(),
    tags: z.string(),
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
  year: number;
  transaction?: Transaction;
  onSuccess?: () => void;
};

export function TransactionForm({
  accounts,
  categories,
  year,
  transaction,
  onSuccess,
}: TransactionFormProps) {
  const router = useRouter();
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
      tags: transaction?.tags?.join(", ") ?? "",
      isRecurring: transaction?.isRecurring ?? false,
      recurrenceStart: transaction?.recurrenceStart ?? "",
      recurrenceEnd: transaction?.recurrenceEnd ?? "",
    },
  });

  const watchType = form.watch("type");
  const watchRecurring = form.watch("isRecurring");

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
      tags: values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
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
          tags: "",
          isRecurring: false,
          recurrenceStart: "",
          recurrenceEnd: "",
        });
      }
      onSuccess?.();
      if (!isEdit) router.push("/transactions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">
          {isEdit ? "Modifica transazione" : "Nuova transazione"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" {...form.register("date")} />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={watchType}
                onValueChange={(v) => {
                  form.setValue("type", v as FormValues["type"]);
                  form.setValue("categoryId", undefined);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TRANSACTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Importo (€)</Label>
              <Input
                id="amount"
                placeholder="0.00"
                className="text-lg"
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
                <Label>Categoria</Label>
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
                      <SelectTrigger aria-invalid={!!form.formState.errors.categoryId}>
                        <SelectValue placeholder="Seleziona categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
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

            <div className="space-y-2 md:col-span-2">
              <Label>Conto</Label>
              <Select
                value={form.watch("accountId")}
                onValueChange={(v) => form.setValue("accountId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona conto" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="notes">Note</Label>
              <Textarea id="notes" rows={3} {...form.register("notes")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tag (separati da virgola)</Label>
              <Input id="tags" placeholder="casa, lavoro" {...form.register("tags")} />
            </div>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="recurring"
                checked={watchRecurring}
                onCheckedChange={(checked) =>
                  form.setValue("isRecurring", checked === true)
                }
              />
              <Label htmlFor="recurring">Ricorrente (mensile)</Label>
            </div>

            {watchRecurring && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="recurrenceStart">Inizio ricorrenza</Label>
                  <Input
                    id="recurrenceStart"
                    type="date"
                    {...form.register("recurrenceStart")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recurrenceEnd">Fine ricorrenza</Label>
                  <Input
                    id="recurrenceEnd"
                    type="date"
                    {...form.register("recurrenceEnd")}
                  />
                </div>
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
      </CardContent>
    </Card>
  );
}
