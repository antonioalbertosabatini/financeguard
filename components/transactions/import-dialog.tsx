"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, FileUp, Landmark, PiggyBank } from "lucide-react";
import { AccountIcon } from "@/components/accounts/account-icon";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { applyImport, loadImportContext } from "@/lib/actions/imports";
import type { ImportSelection } from "@/lib/db/imports";
import { formatErrorMessage } from "@/lib/i18n/translate";
import {
  buildImportPreview,
  fileDateRange,
  isSelectable,
  isSelectableByDefault,
  type PlanTarget,
  type PreviewRow,
} from "@/lib/import/preview";
import { readTabularFile } from "@/lib/import/read-file";
import { BANK_IMPORTERS, getBankImporter } from "@/lib/import/registry";
import type { ParsedRow } from "@/lib/import/types";
import type { Account } from "@/lib/schemas/account";
import type { AccumulationPlan } from "@/lib/schemas/accumulation-plan";
import { formatDate, todayISO } from "@/lib/utils/dates";
import { formatCentsMasked } from "@/lib/utils/money";
import { cn } from "@/lib/utils";
import { useAmountVisibility } from "@/providers/amount-visibility-provider";
import { useI18n } from "@/providers/i18n-provider";

type Step = "bank" | "file" | "preview";

const STEPS: Step[] = ["bank", "file", "preview"];

/** "1 Banca — 2 File — 3 Anteprima" progress indicator. */
function ImportStepper({ current }: { current: Step }) {
  const { t } = useI18n();
  const currentIndex = STEPS.indexOf(current);
  return (
    <ol className="mb-2 flex items-center gap-2 text-xs font-semibold" aria-label={t("import.title")}>
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            {index > 0 && <span className={cn("h-px w-5", done || active ? "bg-primary" : "bg-border")} aria-hidden="true" />}
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full tabular-nums transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-primary-soft text-primary-soft-foreground"
                    : "bg-surface-2 text-muted-foreground"
              )}
            >
              {index + 1}
            </span>
            <span className={active ? "text-foreground" : "text-muted-foreground"}>
              {t(`import.steps.${step}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

type ImportContext = {
  accounts: Account[];
  plans: AccumulationPlan[];
  existingExternalIds: Set<string>;
};

type ImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
};

const NEW_PLAN_VALUE = "__new__";

function monthBounds(offset: number) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: iso(first), to: iso(last) };
}

export function ImportDialog({ open, onOpenChange, locale }: ImportDialogProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        {open && <ImportWizard onClose={() => onOpenChange(false)} locale={locale} />}
      </SheetContent>
    </Sheet>
  );
}

function ImportWizard({ onClose, locale }: { onClose: () => void; locale: string }) {
  const { t, language } = useI18n();
  const { amountsHidden } = useAmountVisibility();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("bank");
  const [bankId, setBankId] = useState<string>(BANK_IMPORTERS[0]?.id ?? "");
  const [context, setContext] = useState<ImportContext | null>(null);
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [planOverrides, setPlanOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const importer = getBankImporter(bankId);

  useEffect(() => {
    loadImportContext().then(setContext, (err) =>
      toast.error(formatErrorMessage(language, err))
    );
  }, [language]);

  const fileRange = useMemo(
    () => (parsedRows ? fileDateRange(parsedRows) : null),
    [parsedRows]
  );

  const preview = useMemo(() => {
    if (!parsedRows || !context) return null;
    return buildImportPreview({
      rows: parsedRows,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      existingExternalIds: context.existingExternalIds,
      plans: context.plans,
    });
  }, [parsedRows, context, dateFrom, dateTo]);

  const account = context?.accounts.find((a) => a.id === accountId);

  function chooseBank(id: string) {
    setBankId(id);
    const hint = getBankImporter(id)?.accountNameHint;
    const accounts = context?.accounts ?? [];
    const suggested =
      (hint && accounts.find((a) => a.name.toLowerCase().includes(hint))) || accounts[0];
    setAccountId((current) => current || suggested?.id || "");
    setStep("file");
  }

  async function handleFile(file: File | undefined) {
    if (!file || !importer) return;
    setParsing(true);
    try {
      const table = await readTabularFile(file);
      const rows = importer.parse(table);
      const range = fileDateRange(rows);
      setParsedRows(rows);
      setFileName(file.name);
      setDateFrom(range?.from ?? "");
      setDateTo(range?.to ?? "");
    } catch (err) {
      setParsedRows(null);
      setFileName("");
      toast.error(formatErrorMessage(language, err));
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function applyPreset(preset: "thisMonth" | "lastMonth" | "all") {
    if (preset === "all") {
      setDateFrom(fileRange?.from ?? "");
      setDateTo(fileRange?.to ?? "");
      return;
    }
    const bounds = monthBounds(preset === "thisMonth" ? 0 : -1);
    setDateFrom(bounds.from);
    setDateTo(bounds.to > todayISO() ? todayISO() : bounds.to);
  }

  function goToPreview() {
    if (!preview) return;
    setSelected(
      new Set(preview.rows.filter(isSelectableByDefault).map((row) => row.key))
    );
    setPlanOverrides({});
    setStep("preview");
  }

  function toggleRow(key: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function planTargetFor(row: Extract<PreviewRow, { planTarget: PlanTarget }>): PlanTarget {
    const override = planOverrides[row.key];
    if (!override) return row.planTarget;
    if (override === NEW_PLAN_VALUE) {
      return { kind: "new", name: row.row.planName, isin: row.row.isin };
    }
    return { kind: "existing", planId: override };
  }

  const selectedRows = preview?.rows.filter((row) => selected.has(row.key)) ?? [];

  async function handleConfirm() {
    if (!preview || !accountId) return;
    const selection: ImportSelection = { accountId, transactions: [], contributions: [] };
    for (const item of selectedRows) {
      if (item.row.kind === "transaction") {
        selection.transactions.push({
          type: item.row.type,
          date: item.row.date,
          amount: item.row.amount,
          notes: item.row.notes,
          externalId: item.row.externalId,
        });
      } else if (item.row.kind === "pacContribution" && "planTarget" in item) {
        selection.contributions.push({
          date: item.row.date,
          amount: item.row.amount,
          externalId: item.row.externalId,
          isin: item.row.isin,
          target: planTargetFor(item),
        });
      }
    }

    setSaving(true);
    try {
      const result = await applyImport(selection);
      toast.success(
        t("import.success", {
          transactions: result.transactions,
          contributions: result.contributions,
          plans: result.plansCreated,
        })
      );
      onClose();
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    } finally {
      setSaving(false);
    }
  }

  const money = (cents: number) => formatCentsMasked(cents, account?.currency ?? "EUR", locale, amountsHidden);

  const counts = useMemo(() => {
    const result = { new: 0, duplicate: 0, unsupported: 0 };
    for (const row of preview?.rows ?? []) {
      if (row.status === "duplicate") result.duplicate++;
      else if (row.status === "unsupported") result.unsupported++;
      else result.new++;
    }
    return result;
  }, [preview]);

  // ---------------------------------------------------------------- render

  if (step === "bank") {
    return (
      <>
        <SheetHeader>
        <ImportStepper current={step} />
          <ImportStepper current={step} />
          <SheetTitle>{t("import.title")}</SheetTitle>
          <SheetDescription>{t("import.chooseBank")}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-2 overflow-y-auto sm:grid-cols-2">
          {BANK_IMPORTERS.map((bank) => (
            <button
              key={bank.id}
              type="button"
              onClick={() => chooseBank(bank.id)}
              disabled={!context}
              className="pressable flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:bg-surface-2 disabled:opacity-50"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                <Landmark className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">{bank.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {bank.accept.join(", ")}
                </span>
              </span>
            </button>
          ))}
        </div>
      </>
    );
  }

  if (step === "file") {
    const accounts = context?.accounts ?? [];
    return (
      <>
        <SheetHeader>
        <ImportStepper current={step} />
          <ImportStepper current={step} />
          <SheetTitle>{t("import.titleBank", { bank: importer?.label ?? "" })}</SheetTitle>
          <SheetDescription>{t("import.fileHint", { bank: importer?.label ?? "" })}</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 overflow-y-auto">
          <div className="space-y-2">
            <Label>{t("import.file")}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={importer?.accept.join(",")}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              disabled={parsing}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="size-4" />
              <span className="truncate">{fileName || t("import.chooseFile")}</span>
            </Button>
            {parsedRows && (
              <p className="text-xs text-muted-foreground">
                {t("import.fileSummary", {
                  rows: parsedRows.length,
                  from: fileRange ? formatDate(fileRange.from) : "—",
                  to: fileRange ? formatDate(fileRange.to) : "—",
                })}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("import.account")}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("transactions.form.selectAccount")} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <AccountIcon name={a.icon} className="size-3.5 text-muted-foreground" />
                      {a.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {accounts.length === 0 && (
              <p className="text-xs text-danger">{t("import.noAccounts")}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("import.period")}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                aria-label={t("common.fromDate")}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <Input
                type="date"
                aria-label={t("common.toDate")}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="xs" variant="secondary" onClick={() => applyPreset("thisMonth")}>
                {t("import.presetThisMonth")}
              </Button>
              <Button type="button" size="xs" variant="secondary" onClick={() => applyPreset("lastMonth")}>
                {t("import.presetLastMonth")}
              </Button>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                disabled={!fileRange}
                onClick={() => applyPreset("all")}
              >
                {t("import.presetAll")}
              </Button>
            </div>
          </div>
        </div>
        <SheetFooter className="flex-row justify-between">
          <Button variant="ghost" onClick={() => setStep("bank")}>
            <ArrowLeft className="size-4" />
            {t("common.back")}
          </Button>
          <Button
            onClick={goToPreview}
            disabled={!parsedRows || !accountId || !preview || (dateFrom > dateTo && !!dateTo)}
          >
            {t("import.showPreview")}
          </Button>
        </SheetFooter>
      </>
    );
  }

  // step === "preview"
  const plans = context?.plans ?? [];
  return (
    <>
      <SheetHeader>
        <ImportStepper current={step} />
        <SheetTitle>{t("import.previewTitle")}</SheetTitle>
        <SheetDescription>
          {t("import.previewSummary", {
            new: counts.new,
            duplicate: counts.duplicate,
            unsupported: counts.unsupported,
            outOfPeriod: preview?.outOfPeriod ?? 0,
          })}
        </SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {(preview?.rows.length ?? 0) === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("import.previewEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {preview?.rows.map((item) => {
              const row = item.row;
              const disabled = !isSelectable(item);
              const isChecked = selected.has(item.key);
              const signedAmount =
                row.kind === "transaction"
                  ? row.type === "income"
                    ? row.amount
                    : -row.amount
                  : row.kind === "pacContribution"
                    ? -row.amount
                    : row.amount;
              const currencyMismatch =
                row.kind !== "skipped" && account && row.currency !== account.currency;
              return (
                <li
                  key={item.key}
                  className={cn("flex gap-3 p-3", disabled && "opacity-60")}
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={isChecked}
                    disabled={disabled}
                    onCheckedChange={(checked) => toggleRow(item.key, checked === true)}
                    aria-label={row.notes}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {row.kind === "pacContribution" ? row.planName : row.notes || row.sourceType}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {row.date ? formatDate(row.date) : "—"} · {t(`import.kind.${row.kind === "transaction" ? row.type : row.kind}`)}
                        </p>
                      </div>
                      {signedAmount !== undefined && (
                        <span
                          className={cn(
                            "shrink-0 text-sm font-semibold tabular-nums",
                            signedAmount > 0 ? "text-success" : "text-danger"
                          )}
                        >
                          {signedAmount > 0 ? "+" : "−"}
                          {money(Math.abs(signedAmount))}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.status === "duplicate" && (
                        <Badge variant="secondary" className="h-5 px-2 text-[0.6875rem]">
                          {t("import.status.duplicate")}
                        </Badge>
                      )}
                      {item.status === "warning" && (
                        <Badge
                          variant="warning"
                          className="h-5 px-2 text-[0.6875rem]"
                        >
                          {t("import.status.unknownType", { type: row.sourceType })}
                        </Badge>
                      )}
                      {row.kind === "skipped" && (
                        <Badge variant="outline" className="h-5 px-2 text-[0.6875rem]">
                          {t(`import.skipReason.${row.reason}`)}
                        </Badge>
                      )}
                      {currencyMismatch && (
                        <Badge
                          variant="warning"
                          className="h-5 px-2 text-[0.6875rem]"
                        >
                          {t("import.status.currency", { currency: row.currency })}
                        </Badge>
                      )}
                    </div>
                    {"planTarget" in item && item.status !== "duplicate" && (
                      <div className="flex items-center gap-2 pt-1">
                        <PiggyBank className="size-3.5 shrink-0 text-muted-foreground" />
                        <Select
                          value={
                            planOverrides[item.key] ??
                            (item.planTarget.kind === "existing"
                              ? item.planTarget.planId
                              : NEW_PLAN_VALUE)
                          }
                          onValueChange={(value) =>
                            setPlanOverrides((prev) => ({ ...prev, [item.key]: value }))
                          }
                        >
                          <SelectTrigger size="sm" className="h-8 w-full text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NEW_PLAN_VALUE}>
                              {t("import.newPlan", { name: row.kind === "pacContribution" ? row.planName : "" })}
                            </SelectItem>
                            {plans.map((plan) => (
                              <SelectItem key={plan.id} value={plan.id}>
                                {plan.name}
                                {plan.isin ? ` · ${plan.isin}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <SheetFooter className="flex-row justify-between">
        <Button variant="ghost" onClick={() => setStep("file")}>
          <ArrowLeft className="size-4" />
          {t("common.back")}
        </Button>
        <Button onClick={handleConfirm} disabled={selectedRows.length === 0 || saving}>
          {t("import.confirm", { count: selectedRows.length })}
        </Button>
      </SheetFooter>
    </>
  );
}
