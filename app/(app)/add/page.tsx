"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadTransactionFormDeps } from "@/lib/actions/transactions";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { useI18n } from "@/providers/i18n-provider";
import { useYear } from "@/providers/year-provider";

export default function AddPage() {
  const { t } = useI18n();
  const { year } = useYear();
  const yearQuery = `?year=${year}`;
  const { data } = useAsyncData(() => loadTransactionFormDeps(year), [year]);

  if (!data) return <FullScreenLoader />;

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
        <Card className="shadow-sm">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">
              {t("transactions.addPage.needAccount")}
            </p>
            <Button asChild>
              <Link href={`/accounts${yearQuery}`}>
                {t("transactions.addPage.goToAccounts")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">
              {t("transactions.addPage.needCategories")}
            </p>
            <Button asChild>
              <Link href="/categories">
                {t("transactions.addPage.goToCategories")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : !hasExpenseCategories || !hasIncomeCategories ? (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="py-4 text-sm text-amber-900">
            {t(
              !hasExpenseCategories && !hasIncomeCategories
                ? "transactions.addPage.missingBothTypes"
                : !hasExpenseCategories
                  ? "transactions.addPage.missingExpense"
                  : "transactions.addPage.missingIncome"
            )}{" "}
            {addInCategoriesPrefix}{" "}
            <Link href="/categories" className="font-medium underline">
              {categoriesLabel}
            </Link>
            .
          </CardContent>
        </Card>
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
