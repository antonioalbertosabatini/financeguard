import { z } from "zod";
import {
  createAccount as dbCreateAccount,
  deleteAccount as dbDeleteAccount,
  getAccounts as dbGetAccounts,
  reorderAccounts as dbReorderAccounts,
  updateAccount as dbUpdateAccount,
} from "@/lib/db/accounts";
import { getAllAccountTransfers } from "@/lib/db/account-transfers";
import { getAccumulationPlans } from "@/lib/db/accumulation-plans";
import { getStockHoldings } from "@/lib/db/stock-holdings";
import { getAllTransactions } from "@/lib/db/transactions";
import { AppError } from "@/lib/i18n/app-error";
import {
  accountInputSchema,
  type AccountInput,
} from "@/lib/schemas/account";

export async function getAccounts() {
  return dbGetAccounts();
}

export async function createAccount(data: AccountInput) {
  const parsed = accountInputSchema.parse(data);
  return dbCreateAccount(parsed);
}

export async function updateAccount(id: string, data: AccountInput) {
  const parsed = accountInputSchema.parse(data);
  return dbUpdateAccount(id, parsed);
}

export async function reorderAccounts(orderedIds: string[]) {
  const parsed = z.array(z.string().min(1)).parse(orderedIds);
  return dbReorderAccounts(parsed);
}

export async function deleteAccount(id: string) {
  const [transactions, transfers, plans, holdings] = await Promise.all([
    getAllTransactions(),
    getAllAccountTransfers(),
    getAccumulationPlans(),
    getStockHoldings(),
  ]);

  if (transactions.some((t) => t.accountId === id)) {
    throw new AppError("errors.deleteAccountInTransactions");
  }
  if (transfers.some((t) => t.fromAccountId === id || t.toAccountId === id)) {
    throw new AppError("errors.deleteAccountInTransfers");
  }
  if (
    plans.some((plan) =>
      (plan.oneTimeContributions ?? []).some(
        (extra) => extra.sourceAccountId === id
      )
    )
  ) {
    throw new AppError("errors.deleteAccountInPlans");
  }
  if (
    holdings.some((holding) =>
      (holding.purchases ?? []).some((purchase) => purchase.sourceAccountId === id)
    )
  ) {
    throw new AppError("errors.deleteAccountInHoldings");
  }
  await dbDeleteAccount(id);
}
