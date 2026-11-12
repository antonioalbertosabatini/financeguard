"use client";

import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { AccountIcon } from "@/components/accounts/account-icon";
import { ACCOUNT_TYPE_DOT } from "@/components/accounts/account-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createAccount, updateAccount } from "@/lib/actions/accounts";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { ACCOUNT_ICON_NAMES } from "@/lib/constants/account-icons";
import { formatErrorMessage } from "@/lib/i18n/translate";
import type { Account } from "@/lib/schemas/account";
import { centsToEuroString, toCents } from "@/lib/utils/money";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

type AccountType = (typeof ACCOUNT_TYPES)[number];

interface FormValues {
  name: string;
  type: AccountType;
  icon: string;
  initialBalance: string;
  currency: string;
}

interface AccountFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Account to edit; undefined creates a new one. */
  account?: Account | null;
  defaultCurrency: string;
}

function AccountForm({
  account,
  defaultCurrency,
  onDone,
}: {
  account?: Account | null;
  defaultCurrency: string;
  onDone: () => void;
}) {
  const { t, language } = useI18n();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t("accounts.nameRequired")),
        type: z.enum(ACCOUNT_TYPES),
        icon: z.string().min(1),
        initialBalance: z
          .string()
          .refine((v) => v.trim() === "" || !Number.isNaN(parseFloat(v.replace(",", "."))), t("accounts.balanceInvalid")),
        currency: z.string().trim().regex(/^[A-Za-z]{3}$/, t("accounts.currencyInvalid")),
      }),
    [t]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: account?.name ?? "",
      type: account?.type ?? "checking",
      icon: account?.icon ?? ACCOUNT_ICON_NAMES[0],
      initialBalance: account ? centsToEuroString(account.initialBalance) : "0,00",
      currency: account?.currency ?? defaultCurrency,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const currency = form.watch("currency");
  const selectedType = form.watch("type");

  async function onSubmit(values: FormValues) {
    const data = {
      name: values.name.trim(),
      type: values.type,
      icon: values.icon,
      initialBalance: toCents(values.initialBalance),
      currency: values.currency.trim().toUpperCase(),
    };
    try {
      if (account) {
        await updateAccount(account.id, data);
        toast.success(t("accounts.updated"));
      } else {
        await createAccount(data);
        toast.success(t("accounts.created"));
      }
      onDone();
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="-mx-1 space-y-5 overflow-y-auto px-1" noValidate>
      <div className="space-y-2">
        <Label htmlFor="account-name">{t("common.name")}</Label>
        <Input id="account-name" aria-invalid={!!errors.name} {...form.register("name")} />
        {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <p id="account-type-label" className="text-sm font-medium">{t("common.type")}</p>
        <div role="radiogroup" aria-labelledby="account-type-label" className="grid grid-cols-2 gap-2">
          {ACCOUNT_TYPES.map((type) => {
            const active = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => form.setValue("type", type)}
                className={cn(
                  "pressable flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-transparent ring-2 ring-primary" : "border-border bg-card hover:bg-surface-2"
                )}
              >
                <span className={cn("size-2.5 rounded-full", ACCOUNT_TYPE_DOT[type])} aria-hidden="true" />
                {t(`labels.accountType.${type}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p id="account-icon-label" className="text-sm font-medium">{t("common.icon")}</p>
        <Controller
          name="icon"
          control={form.control}
          render={({ field }) => (
            <div
              role="radiogroup"
              aria-labelledby="account-icon-label"
              className="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto rounded-xl bg-surface-2 p-2"
            >
              {ACCOUNT_ICON_NAMES.map((name) => {
                const active = field.value === name;
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={name}
                    onClick={() => field.onChange(name)}
                    className={cn(
                      "pressable flex aspect-square items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "bg-primary text-primary-foreground shadow-soft" : "bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <AccountIcon name={name} className="size-5" />
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>

      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <div className="space-y-2">
          <Label htmlFor="account-balance">
            {t("accounts.initialBalance", { currency: (currency || "").toUpperCase() })}
          </Label>
          <Input
            id="account-balance"
            inputMode="decimal"
            className="tabular-nums"
            aria-invalid={!!errors.initialBalance}
            {...form.register("initialBalance")}
          />
          {errors.initialBalance && (
            <p role="alert" className="text-xs text-destructive">{errors.initialBalance.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-currency">{t("common.currency")}</Label>
          <Input
            id="account-currency"
            maxLength={3}
            className="uppercase"
            aria-invalid={!!errors.currency}
            {...form.register("currency")}
          />
        </div>
        {errors.currency && (
          <p role="alert" className="col-span-2 -mt-1 text-xs text-destructive">{errors.currency.message}</p>
        )}
      </div>

      <SheetFooter>
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
          {t("common.save")}
        </Button>
      </SheetFooter>
    </form>
  );
}

/** Create / edit account sheet (react-hook-form + zod). */
export function AccountFormSheet({ open, onOpenChange, account, defaultCurrency }: AccountFormSheetProps) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{account ? t("accounts.edit") : t("accounts.new")}</SheetTitle>
        </SheetHeader>
        {open && (
          <AccountForm
            key={account?.id ?? "new"}
            account={account}
            defaultCurrency={defaultCurrency}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
