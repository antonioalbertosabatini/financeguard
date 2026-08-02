"use client";

import { InvestmentsView } from "@/components/investments/investments-view";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { getInvestmentsData } from "@/lib/actions/investments";
import { getSettings } from "@/lib/actions/settings";
import { useAsyncData } from "@/lib/storage/use-async-data";

export default function InvestmentsPage() {
  const { data } = useAsyncData(async () => {
    const [investments, settings] = await Promise.all([
      getInvestmentsData(),
      getSettings(),
    ]);
    return { investments, settings };
  }, []);

  if (!data) return <FullScreenLoader />;

  return (
    <InvestmentsView
      positions={data.investments.positions}
      accounts={data.investments.accounts}
      settings={data.settings}
    />
  );
}
