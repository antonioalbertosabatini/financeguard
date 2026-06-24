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
  return dbCreateAccountTransfer(parsed);
}

export async function updateAccountTransfer(
  id: string,
  year: number,
  data: AccountTransferInput
) {
  const parsed = accountTransferInputSchema.parse(data);
  return dbUpdateAccountTransfer(id, year, parsed);
}

export async function deleteAccountTransfer(id: string, year: number) {
  await dbDeleteAccountTransfer(id, year);
}
