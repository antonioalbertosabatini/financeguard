"use client";

import { PlansView } from "@/components/plans/plans-view";
import { ErrorState } from "@/components/common/error-state";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { getAccumulationPlansPageData } from "@/lib/actions/accumulation-plans";
import { getStockHoldingsPageData } from "@/lib/actions/stock-holdings";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { useYear } from "@/providers/year-provider";

export default function PlansPage() {
  const { year } = useYear();
  const { data, failed, error, reload } = useAsyncData(
    () =>
      Promise.all([
        getAccumulationPlansPageData(year),
        getStockHoldingsPageData(year),
      ]).then(([plans, stocks]) => ({
        items: plans.items,
        holdings: stocks.items,
        accounts: plans.accounts,
        settings: plans.settings,
      })),
    [year]
  );

  if (!data && failed) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <PageSkeleton variant="cards" />;

  return (
    <PlansView
      items={data.items}
      holdings={data.holdings}
      accounts={data.accounts}
      year={year}
      currency={data.settings.defaultCurrency}
      locale={data.settings.locale}
    />
  );
}
