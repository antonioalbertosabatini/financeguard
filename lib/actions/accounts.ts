"use server";

import { revalidatePath } from "next/cache";
import {
  createAccount as dbCreateAccount,
  deleteAccount as dbDeleteAccount,
  getAccounts as dbGetAccounts,
  updateAccount as dbUpdateAccount,
} from "@/lib/db/accounts";
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
  const account = await dbCreateAccount(parsed);
  revalidatePath("/accounts");
  revalidatePath("/");
  return account;
}

export async function updateAccount(id: string, data: AccountInput) {
  const parsed = accountInputSchema.parse(data);
  const account = await dbUpdateAccount(id, parsed);
  revalidatePath("/accounts");
  revalidatePath("/");
  return account;
}

export async function deleteAccount(id: string) {
  const transactions = await getAllTransactions();
  if (transactions.some((t) => t.accountId === id)) {
    throw new Error("Impossibile eliminare: conto usato in transazioni");
  }
  await dbDeleteAccount(id);
  revalidatePath("/accounts");
  revalidatePath("/");
}
