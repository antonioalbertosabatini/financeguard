import {
  createAccount as dbCreateAccount,
  deleteAccount as dbDeleteAccount,
  getAccounts as dbGetAccounts,
  updateAccount as dbUpdateAccount,
} from "@/lib/db/accounts";
import { getAllAccountTransfers } from "@/lib/db/account-transfers";
import { getAllTransactions } from "@/lib/db/transactions";
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

export async function deleteAccount(id: string) {
  const [transactions, transfers] = await Promise.all([
    getAllTransactions(),
    getAllAccountTransfers(),
  ]);

  if (transactions.some((t) => t.accountId === id)) {
    throw new Error("Impossibile eliminare: conto usato in transazioni");
  }
  if (transfers.some((t) => t.fromAccountId === id || t.toAccountId === id)) {
    throw new Error("Impossibile eliminare: conto usato in trasferimenti");
  }
  await dbDeleteAccount(id);
}
