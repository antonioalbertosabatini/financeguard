"use client";

import { AccountsView } from "@/components/accounts/accounts-view";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { getAccountTransfers } from "@/lib/actions/account-transfers";
import { getAccountsAnalysisSummary } from "@/lib/actions/transactions";
import { getSettings } from "@/lib/actions/settings";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { currentYear, todayISO } from "@/lib/utils/dates";
import { useYear } from "@/providers/year-provider";

export default function AccountsPage() {
  const { year } = useYear();
  const { data } = useAsyncData(async () => {
    const nowYear = currentYear();
    const asOfISO = year === nowYear ? todayISO() : `${year}-12-31`;
    const [analysis, settings, transfers] = await Promise.all([
      getAccountsAnalysisSummary(year, asOfISO),
      getSettings(),
      getAccountTransfers(year),
    ]);
    return { analysis, settings, transfers };
  }, [year]);

  if (!data) return <FullScreenLoader />;

  return (
    <AccountsView
      analysis={data.analysis}
      transfers={data.transfers}
      currency={data.settings.defaultCurrency}
      locale={data.settings.locale}
      year={year}
    />
  );
}
