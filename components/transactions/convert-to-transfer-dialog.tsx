"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { AccountIcon } from "@/components/accounts/account-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  convertTransactionToTransfer,
  findMirrorCandidates,
} from "@/lib/actions/account-transfers";
import { formatErrorMessage } from "@/lib/i18n/translate";
import type { Account } from "@/lib/schemas/account";
import type { Transaction } from "@/lib/schemas/transaction";
import { formatDate } from "@/lib/utils/dates";
import { formatCentsMasked } from "@/lib/utils/money";
import { cn } from "@/lib/utils";
import { useAmountVisibility } from "@/providers/amount-visibility-provider";
import { useI18n } from "@/providers/i18n-provider";

type MirrorCandidate = Transaction & { year: number };

type ConvertToTransferDialogProps = {
  transaction: Transaction | null;
  year: number;
  accounts: Account[];
  currency: string;
  locale: string;
  onOpenChange: (open: boolean) => void;
  onConverted?: () => void;
};

export function ConvertToTransferDialog(props: ConvertToTransferDialogProps) {
  return (
    <Dialog
      open={!!props.transaction}
      onOpenChange={(open) => !open && props.onOpenChange(false)}
    >
      <DialogContent className="sm:max-w-md">
        {props.transaction && (
          <ConvertToTransferForm
            key={props.transaction.id}
            {...props}
            transaction={props.transaction}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConvertToTransferForm({
  transaction,
  year,
  accounts,
  currency,
  locale,
  onOpenChange,
  onConverted,
}: ConvertToTransferDialogProps & { transaction: Transaction }) {
  const { t, language } = useI18n();
  const { amountsHidden } = useAmountVisibility();
  const otherAccounts = useMemo(
    () => accounts.filter((account) => account.id !== transaction.accountId),
    [accounts, transaction.accountId]
  );
  const [otherAccountId, setOtherAccountId] = useState(otherAccounts[0]?.id ?? "");
  const [notes, setNotes] = useState(transaction.notes ?? "");
  const [mirrors, setMirrors] = useState<MirrorCandidate[]>([]);
  const [mirrorId, setMirrorId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const isIncome = transaction.type === "income";
  const currentAccount = accounts.find((a) => a.id === transaction.accountId);

  useEffect(() => {
    let cancelled = false;
    if (!otherAccountId) return;
    findMirrorCandidates(transaction.id, year, otherAccountId).then((found) => {
      if (cancelled) return;
      setMirrors(found);
      // Con un'unica speculare la proponiamo gia' selezionata.
      setMirrorId(found.length === 1 ? found[0].id : "");
    });
    return () => {
      cancelled = true;
    };
  }, [transaction.id, year, otherAccountId]);

  async function handleConfirm() {
    if (!otherAccountId) return;
    setSaving(true);
    try {
      const mirror = mirrors.find((item) => item.id === mirrorId);
      await convertTransactionToTransfer({
        transactionId: transaction.id,
        year,
        otherAccountId,
        notes,
        mirror: mirror ? { id: mirror.id, year: mirror.year } : undefined,
      });
      toast.success(
        mirror
          ? t("transactions.convertToTransfer.successWithMirror")
          : t("transactions.convertToTransfer.success")
      );
      onOpenChange(false);
      onConverted?.();
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    } finally {
      setSaving(false);
    }
  }

  const amount = formatCentsMasked(transaction.amount, currency, locale, amountsHidden);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("transactions.convertToTransfer.title")}</DialogTitle>
        <DialogDescription>
          {t(
            isIncome
              ? "transactions.convertToTransfer.descriptionIncome"
              : "transactions.convertToTransfer.descriptionExpense",
            {
              amount,
              date: formatDate(transaction.date),
              account: currentAccount?.name ?? "—",
            }
          )}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>
            {isIncome
              ? t("transactions.convertToTransfer.fromAccount")
              : t("transactions.convertToTransfer.toAccount")}
          </Label>
          <Select value={otherAccountId} onValueChange={setOtherAccountId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("transactions.form.selectAccount")} />
            </SelectTrigger>
            <SelectContent>
              {otherAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <span className="flex items-center gap-2">
                    <AccountIcon name={account.icon} className="size-3.5 text-muted-foreground" />
                    {account.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="convert-notes">{t("common.notes")}</Label>
          <Input
            id="convert-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {mirrors.length > 0 && (
          <fieldset className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <legend className="px-1 text-sm font-medium">
              {t("transactions.convertToTransfer.mirrorTitle")}
            </legend>
            <p className="text-xs text-muted-foreground">
              {t("transactions.convertToTransfer.mirrorHint")}
            </p>
            {[...mirrors, null].map((mirror) => {
              const value = mirror?.id ?? "";
              return (
                <label
                  key={value || "none"}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-md p-2 text-sm transition-colors hover:bg-muted",
                    mirrorId === value && "bg-muted"
                  )}
                >
                  <input
                    type="radio"
                    name="mirror"
                    className="mt-0.5 accent-primary"
                    checked={mirrorId === value}
                    onChange={() => setMirrorId(value)}
                  />
                  {mirror ? (
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">
                        {t("transactions.convertToTransfer.mirrorDelete", {
                          date: formatDate(mirror.date),
                          amount,
                        })}
                      </span>
                      {mirror.notes && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {mirror.notes}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>{t("transactions.convertToTransfer.mirrorKeep")}</span>
                  )}
                </label>
              );
            })}
          </fieldset>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleConfirm} disabled={!otherAccountId || saving}>
          {t("transactions.convertToTransfer.confirm")}
        </Button>
      </DialogFooter>
    </>
  );
}
