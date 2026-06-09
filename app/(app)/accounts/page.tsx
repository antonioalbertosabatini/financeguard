import { AccountsView } from "@/components/accounts/accounts-view";
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
  const [accounts, settings] = await Promise.all([
    getAccountsWithBalances(year),
    getSettings(),
  ]);

  return (
    <AccountsView
      accounts={accounts}
      currency={settings.defaultCurrency}
      locale={settings.locale}
    />
  );
}
