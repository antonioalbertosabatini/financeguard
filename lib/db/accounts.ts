import { commit, getDataset } from "@/lib/storage/data-store";
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
  getDataset().accounts.push(account);
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
  const updated = { ...input, id };
  accounts[index] = updated;
  commit();
  return updated;
}

export async function deleteAccount(id: string): Promise<void> {
  const dataset = getDataset();
  dataset.accounts = dataset.accounts.filter((a) => a.id !== id);
  commit();
}
