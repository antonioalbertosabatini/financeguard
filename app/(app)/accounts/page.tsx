import { AccountsView } from "@/components/accounts/accounts-view";
import { getAccountTransfers } from "@/lib/actions/account-transfers";
import { getAccountsWithBalances } from "@/lib/actions/transactions";
import { getSettings } from "@/lib/actions/settings";
import { currentYear } from "@/lib/utils/dates";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = params.year ? parseInt(params.year, 10) : currentYear();
  const [accounts, settings, transfers] = await Promise.all([
    getAccountsWithBalances(year),
    getSettings(),
    getAccountTransfers(year),
  ]);

  return (
    <AccountsView
      accounts={accounts}
      transfers={transfers}
      currency={settings.defaultCurrency}
      locale={settings.locale}
      year={year}
    />
  );
}
