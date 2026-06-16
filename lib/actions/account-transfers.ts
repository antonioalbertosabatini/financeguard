"use server";

import { revalidatePath } from "next/cache";
import {
  createAccountTransfer as dbCreateAccountTransfer,
  deleteAccountTransfer as dbDeleteAccountTransfer,
  getAccountTransfersForYear,
  updateAccountTransfer as dbUpdateAccountTransfer,
} from "@/lib/db/account-transfers";
import {
  accountTransferInputSchema,
  type AccountTransferInput,
} from "@/lib/schemas/account-transfer";

export async function getAccountTransfers(year: number) {
  return getAccountTransfersForYear(year);
}

export async function createAccountTransfer(data: AccountTransferInput) {
  const parsed = accountTransferInputSchema.parse(data);
  const transfer = await dbCreateAccountTransfer(parsed);
  revalidatePath("/accounts");
  revalidatePath("/");
  return transfer;
}

export async function updateAccountTransfer(
  id: string,
  year: number,
  data: AccountTransferInput
) {
  const parsed = accountTransferInputSchema.parse(data);
  const transfer = await dbUpdateAccountTransfer(id, year, parsed);
  revalidatePath("/accounts");
  revalidatePath("/");
  return transfer;
}

export async function deleteAccountTransfer(id: string, year: number) {
  await dbDeleteAccountTransfer(id, year);
  revalidatePath("/accounts");
  revalidatePath("/");
}

