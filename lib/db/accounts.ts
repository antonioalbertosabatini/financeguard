import { commit, getDataset, getDeviceId } from "@/lib/storage/data-store";
import { AppError } from "@/lib/i18n/app-error";
import {
  trackAccountUpsert,
  trackDelete,
} from "@/lib/sync/sync-metadata";
import {
  accountsFileSchema,
  sortAccounts,
  type Account,
  type AccountInput,
} from "@/lib/schemas/account";
import { generateId } from "@/lib/db/index";

export async function getAccounts(): Promise<Account[]> {
  const parsed = accountsFileSchema.parse({
    accounts: getDataset().accounts,
  }).accounts;
  return sortAccounts(parsed);
}

function nextAccountOrder(accounts: Account[]): number {
  if (accounts.length === 0) return 0;
  return Math.max(...accounts.map((account) => account.order)) + 1;
}

export async function createAccount(input: AccountInput): Promise<Account> {
  const dataset = getDataset();
  const account: Account = {
    ...input,
    id: generateId("acc"),
    order: nextAccountOrder(dataset.accounts),
  };
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
  if (index === -1) throw new AppError("errors.accountNotFound");
  const previous = accounts[index];
  const updated = { ...previous, ...input, id };
  accounts[index] = updated;
  trackAccountUpsert(getDataset(), updated, getDeviceId(), previous);
  commit();
  return updated;
}

export async function reorderAccounts(orderedIds: string[]): Promise<void> {
  const dataset = getDataset();
  const byId = new Map(dataset.accounts.map((account) => [account.id, account]));
  if (
    orderedIds.length !== dataset.accounts.length ||
    new Set(orderedIds).size !== orderedIds.length ||
    orderedIds.some((id) => !byId.has(id))
  ) {
    throw new AppError("errors.invalidAccountOrder");
  }

  const deviceId = getDeviceId();
  const reordered: Account[] = [];
  for (const [index, id] of orderedIds.entries()) {
    const previous = byId.get(id)!;
    if (previous.order === index) {
      reordered.push(previous);
      continue;
    }
    const updated = { ...previous, order: index };
    trackAccountUpsert(dataset, updated, deviceId, previous);
    reordered.push(updated);
  }
  dataset.accounts = reordered;
  commit();
}

export async function deleteAccount(id: string): Promise<void> {
  const dataset = getDataset();
  dataset.accounts = dataset.accounts.filter((a) => a.id !== id);
  trackDelete(dataset, "account", id, getDeviceId());
  commit();
}
