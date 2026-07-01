"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadTransactionFormDeps } from "@/lib/actions/transactions";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { useYear } from "@/providers/year-provider";

export default function AddPage() {
  const { year } = useYear();
  const yearQuery = `?year=${year}`;
  const { data } = useAsyncData(() => loadTransactionFormDeps(year), [year]);

  if (!data) return <FullScreenLoader />;

  const { accounts, categories, availableTags } = data;
  const hasExpenseCategories = categories.some((c) => c.type === "expense");
  const hasIncomeCategories = categories.some((c) => c.type === "income");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inserimento"
        description="Aggiungi una nuova transazione"
      />

      {accounts.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">
              Crea almeno un conto prima di inserire transazioni.
            </p>
            <Button asChild>
              <Link href={`/accounts${yearQuery}`}>Vai ai conti</Link>
            </Button>
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">
              Servono almeno una categoria entrata e una uscita per registrare
              movimenti.
            </p>
            <Button asChild>
              <Link href="/categories">Vai alle categorie</Link>
            </Button>
          </CardContent>
        </Card>
      ) : !hasExpenseCategories || !hasIncomeCategories ? (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="py-4 text-sm text-amber-900">
            Mancano categorie di tipo{" "}
            {!hasExpenseCategories && !hasIncomeCategories
              ? "entrata e uscita"
              : !hasExpenseCategories
                ? "uscita"
                : "entrata"}
            . Aggiungi categorie in{" "}
            <Link href="/categories" className="font-medium underline">
              Categorie
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
