import { AccountsView } from "@/components/accounts/accounts-view";
import { getAccountTransfers } from "@/lib/actions/account-transfers";
import { getAccountsAnalysisSummary } from "@/lib/actions/transactions";
import { getSettings } from "@/lib/actions/settings";
import { currentYear, todayISO } from "@/lib/utils/dates";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = params.year ? parseInt(params.year, 10) : currentYear();
  const nowYear = currentYear();
  const asOfISO = year === nowYear ? todayISO() : `${year}-12-31`;
  const [analysis, settings, transfers] = await Promise.all([
    getAccountsAnalysisSummary(year, asOfISO),
    getSettings(),
    getAccountTransfers(year),
  ]);

  return (
    <AccountsView
      accounts={analysis.accountsAsOf}
      analysis={analysis}
      transfers={transfers}
      currency={settings.defaultCurrency}
      locale={settings.locale}
      year={year}
    />
  );
}
