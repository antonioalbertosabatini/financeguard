import path from "path";
import { DATA_DIR } from "@/lib/constants";
import {
  accountsFileSchema,
  type Account,
  type AccountInput,
} from "@/lib/schemas/account";
import { generateId, getDb } from "@/lib/db/index";

const FILE_PATH = path.join(DATA_DIR, "accounts.json");
const DEFAULT = { accounts: [] as Account[] };

export async function getAccounts(): Promise<Account[]> {
  const db = await getDb(FILE_PATH, DEFAULT);
  await db.read();
  return accountsFileSchema.parse(db.data).accounts;
}

export async function createAccount(input: AccountInput): Promise<Account> {
  const db = await getDb(FILE_PATH, DEFAULT);
  await db.read();
  const account: Account = { ...input, id: generateId("acc") };
  db.data.accounts.push(account);
  await db.write();
  return account;
}

export async function updateAccount(
  id: string,
  input: AccountInput
): Promise<Account> {
  const db = await getDb(FILE_PATH, DEFAULT);
  await db.read();
  const index = db.data.accounts.findIndex((a) => a.id === id);
  if (index === -1) throw new Error("Conto non trovato");
  const updated = { ...input, id };
  db.data.accounts[index] = updated;
  await db.write();
  return updated;
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDb(FILE_PATH, DEFAULT);
  await db.read();
  db.data.accounts = db.data.accounts.filter((a) => a.id !== id);
  await db.write();
}
