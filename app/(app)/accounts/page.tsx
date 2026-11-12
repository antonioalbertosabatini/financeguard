"use client";

import { AccountsView } from "@/components/accounts/accounts-view";
import { ErrorState } from "@/components/common/error-state";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { getAccountTransfers } from "@/lib/actions/account-transfers";
import { getAccountsAnalysisSummary } from "@/lib/actions/transactions";
import { getSettings } from "@/lib/actions/settings";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { currentYear, todayISO } from "@/lib/utils/dates";
import { useYear } from "@/providers/year-provider";

export default function AccountsPage() {
  const { year } = useYear();
  const { data, failed, error, reload } = useAsyncData(async () => {
    const nowYear = currentYear();
    const asOfISO = year === nowYear ? todayISO() : `${year}-12-31`;
    const [analysis, settings, transfers] = await Promise.all([
      getAccountsAnalysisSummary(year, asOfISO),
      getSettings(),
      getAccountTransfers(year),
    ]);
    return { analysis, settings, transfers };
  }, [year]);

  if (!data && failed) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <PageSkeleton variant="cards" />;

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
