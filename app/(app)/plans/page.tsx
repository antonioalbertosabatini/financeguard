"use client";

import { PlansView } from "@/components/plans/plans-view";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { getAccumulationPlansPageData } from "@/lib/actions/accumulation-plans";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { useYear } from "@/providers/year-provider";

export default function PlansPage() {
  const { year } = useYear();
  const { data } = useAsyncData(
    () => getAccumulationPlansPageData(year),
    [year]
  );

  if (!data) return <FullScreenLoader />;

  return (
    <PlansView
      items={data.items}
      accounts={data.accounts}
      year={year}
      currency={data.settings.defaultCurrency}
      locale={data.settings.locale}
    />
  );
}
