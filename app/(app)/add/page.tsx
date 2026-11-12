"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/common/error-state";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { AlertTriangle, Shapes, Wallet } from "lucide-react";
import { useYearHref } from "@/hooks/use-year-href";
import { loadTransactionFormDeps } from "@/lib/actions/transactions";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { useI18n } from "@/providers/i18n-provider";
import { useYear } from "@/providers/year-provider";

export default function AddPage() {
  const { t } = useI18n();
  const { year } = useYear();
  const withYear = useYearHref();
  const { data, failed, error, reload } = useAsyncData(() => loadTransactionFormDeps(year), [year]);

  if (!data && failed) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <PageSkeleton variant="form" />;

  const { accounts, categories, availableTags } = data;
  const hasExpenseCategories = categories.some((c) => c.type === "expense");
  const hasIncomeCategories = categories.some((c) => c.type === "income");
  const categoriesLabel = t("nav.categories");
  const addInCategoriesPrefix = t("transactions.addPage.addInCategories")
    .replace(categoriesLabel, "")
    .replace(/\.\s*$/, "")
    .trim();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("transactions.addPage.title")}
        description={t("transactions.addPage.description")}
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={t("transactions.addPage.needAccount")}
          action={
            <Button asChild>
              <Link href={withYear("/accounts")}>{t("transactions.addPage.goToAccounts")}</Link>
            </Button>
          }
        />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Shapes}
          title={t("transactions.addPage.needCategories")}
          action={
            <Button asChild>
              <Link href="/categories">{t("transactions.addPage.goToCategories")}</Link>
            </Button>
          }
        />
      ) : !hasExpenseCategories || !hasIncomeCategories ? (
        <div
          role="status"
          className="mx-auto flex max-w-2xl items-start gap-3 rounded-xl bg-warning-soft p-4 text-sm text-warning"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            {t(
              !hasExpenseCategories && !hasIncomeCategories
                ? "transactions.addPage.missingBothTypes"
                : !hasExpenseCategories
                  ? "transactions.addPage.missingExpense"
                  : "transactions.addPage.missingIncome"
            )}{" "}
            {addInCategoriesPrefix}{" "}
            <Link href="/categories" className="font-semibold underline">
              {categoriesLabel}
            </Link>
            .
          </p>
        </div>
      ) : null}

      {accounts.length > 0 && (
        <TransactionForm
          accounts={accounts}
          categories={categories}
          availableTags={availableTags}
          year={year}
        />
      )}
    </div>
  );
}
