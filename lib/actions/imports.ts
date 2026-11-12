import { getAccounts } from "@/lib/db/accounts";
import { getAllAccountTransfers } from "@/lib/db/account-transfers";
import { getAccumulationPlans } from "@/lib/db/accumulation-plans";
import { applyImport as dbApplyImport, type ImportSelection } from "@/lib/db/imports";
import { getAllTransactions } from "@/lib/db/transactions";
import { collectExternalIds } from "@/lib/import/preview";

/** Dati che servono al wizard di import: conti, piani e id gia' importati. */
export async function loadImportContext() {
  const [accounts, plans, transactions, transfers] = await Promise.all([
    getAccounts(),
    getAccumulationPlans(),
    getAllTransactions(),
    getAllAccountTransfers(),
  ]);
  return {
    accounts,
    plans,
    existingExternalIds: collectExternalIds({ transactions, transfers, plans }),
  };
}

export async function applyImport(selection: ImportSelection) {
  return dbApplyImport(selection);
}
