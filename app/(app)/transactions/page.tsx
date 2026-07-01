"use client";

import { TransactionsView } from "@/components/transactions/transactions-view";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { getSettings } from "@/lib/actions/settings";
import {
  getTransactionsForListView,
  loadTransactionFormDeps,
} from "@/lib/actions/transactions";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { useYear } from "@/providers/year-provider";

export default function TransactionsPage() {
  const { year } = useYear();
  const { data } = useAsyncData(
    async () => {
      const [{ transactions, occurrences }, formDeps, settings] = await Promise.all([
        getTransactionsForListView(year),
        loadTransactionFormDeps(year),
        getSettings(),
      ]);
      return { transactions, occurrences, settings, ...formDeps };
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
