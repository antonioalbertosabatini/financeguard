import { TransactionsView } from "@/components/transactions/transactions-view";
import { getAccounts } from "@/lib/actions/accounts";
import { getCategories } from "@/lib/actions/categories";
import { getSettings } from "@/lib/actions/settings";
import { getAvailableTags, getTransactions } from "@/lib/actions/transactions";
import { currentYear } from "@/lib/utils/dates";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = params.year ? parseInt(params.year, 10) : currentYear();
  const [transactions, accounts, categories, settings, availableTags] =
    await Promise.all([
    getTransactions(year),
    getAccounts(),
    getCategories(),
    getSettings(),
    getAvailableTags(year),
  ]);

  return (
    <TransactionsView
      transactions={transactions}
      accounts={accounts}
      categories={categories}
      availableTags={availableTags}
      year={year}
      currency={settings.defaultCurrency}
      locale={settings.locale}
    />
  );
}
