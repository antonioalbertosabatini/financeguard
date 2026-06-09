import { TransactionsView } from "@/components/transactions/transactions-view";
import { getAccounts } from "@/lib/actions/accounts";
import { getCategories } from "@/lib/actions/categories";
import { getSettings } from "@/lib/actions/settings";
import { getTransactions } from "@/lib/actions/transactions";
import { currentYear } from "@/lib/utils/dates";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = params.year ? parseInt(params.year, 10) : currentYear();
  const [transactions, accounts, categories, settings] = await Promise.all([
    getTransactions(year),
    getAccounts(),
    getCategories(),
    getSettings(),
  ]);

  return (
    <TransactionsView
      transactions={transactions}
      accounts={accounts}
      categories={categories}
      year={year}
      currency={settings.defaultCurrency}
      locale={settings.locale}
    />
  );
}
