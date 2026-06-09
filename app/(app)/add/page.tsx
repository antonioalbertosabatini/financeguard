import Link from "next/link";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAccounts } from "@/lib/actions/accounts";
import { getCategories } from "@/lib/actions/categories";
import { currentYear } from "@/lib/utils/dates";

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = params.year ? parseInt(params.year, 10) : currentYear();
  const yearQuery = params.year ? `?year=${params.year}` : "";
  const [accounts, categories] = await Promise.all([
    getAccounts(),
    getCategories(),
  ]);

  const hasExpenseCategories = categories.some((c) => c.type === "expense");
  const hasIncomeCategories = categories.some((c) => c.type === "income");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Inserimento</h2>
        <p className="text-sm text-muted-foreground">
          Aggiungi una nuova transazione
        </p>
      </div>

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
            . Puoi comunque inserire trasferimenti o aggiungere categorie in{" "}
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
          year={year}
        />
      )}
    </div>
  );
}
