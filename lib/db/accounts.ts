import { commit, getDataset, getDeviceId } from "@/lib/storage/data-store";
import {
  trackAccountUpsert,
  trackDelete,
} from "@/lib/sync/sync-metadata";
import {
  accountsFileSchema,
  type Account,
  type AccountInput,
} from "@/lib/schemas/account";
import { generateId } from "@/lib/db/index";

export async function getAccounts(): Promise<Account[]> {
  return accountsFileSchema.parse({ accounts: getDataset().accounts }).accounts;
}

export async function createAccount(input: AccountInput): Promise<Account> {
  const account: Account = { ...input, id: generateId("acc") };
  const dataset = getDataset();
  dataset.accounts.push(account);
  trackAccountUpsert(dataset, account, getDeviceId());
  commit();
  return account;
}

export async function updateAccount(
  id: string,
  input: AccountInput
): Promise<Account> {
  const accounts = getDataset().accounts;
  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) throw new Error("Conto non trovato");
  const previous = accounts[index];
  const updated = { ...input, id };
  accounts[index] = updated;
  trackAccountUpsert(getDataset(), updated, getDeviceId(), previous);
  commit();
  return updated;
}

export async function deleteAccount(id: string): Promise<void> {
  const dataset = getDataset();
  dataset.accounts = dataset.accounts.filter((a) => a.id !== id);
  trackDelete(dataset, "account", id, getDeviceId());
  commit();
}
