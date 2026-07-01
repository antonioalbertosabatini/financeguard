"use client";

import { TransactionsView } from "@/components/transactions/transactions-view";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { getAccounts } from "@/lib/actions/accounts";
import { getCategories } from "@/lib/actions/categories";
import { getSettings } from "@/lib/actions/settings";
import { getAvailableTags, getTransactionsForListView } from "@/lib/actions/transactions";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { useYear } from "@/providers/year-provider";

export default function TransactionsPage() {
  const { year } = useYear();
  const { data } = useAsyncData(
    async () => {
      const [{ transactions, occurrences }, accounts, categories, settings, availableTags] =
        await Promise.all([
          getTransactionsForListView(year),
          getAccounts(),
          getCategories(),
          getSettings(),
          getAvailableTags(year),
        ]);
      return { transactions, occurrences, accounts, categories, settings, availableTags };
    },
    [year]
  );

  if (!data) return <FullScreenLoader />;

  return (
    <TransactionsView
      transactions={data.transactions}
      occurrences={data.occurrences}
      accounts={data.accounts}
      categories={data.categories}
      availableTags={data.availableTags}
      year={year}
      currency={data.settings.defaultCurrency}
      locale={data.settings.locale}
    />
  );
}
