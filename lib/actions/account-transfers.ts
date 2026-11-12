import { getAccounts } from "@/lib/db/accounts";
import {
  convertTransactionToTransfer as dbConvertTransactionToTransfer,
  createAccountTransfer as dbCreateAccountTransfer,
  deleteAccountTransfer as dbDeleteAccountTransfer,
  getAccountTransfersForYear,
  updateAccountTransfer as dbUpdateAccountTransfer,
} from "@/lib/db/account-transfers";
import { getTransactionsForYear } from "@/lib/db/transactions";
import { AppError } from "@/lib/i18n/app-error";
import { getCurrentLanguage } from "@/lib/i18n/runtime";
import { translate } from "@/lib/i18n/translate";
import {
  createAccountTransferSchemas,
  type AccountTransferInput,
} from "@/lib/schemas/account-transfer";
import { findMirrorTransactions } from "@/lib/utils/transfer-conversion";

export async function getAccountTransfers(year: number) {
  return getAccountTransfersForYear(year);
}

export async function createAccountTransfer(data: AccountTransferInput) {
  const { accountTransferInputSchema } = createAccountTransferSchemas(
    (key, params) => translate(getCurrentLanguage(), key, params)
  );
  const parsed = accountTransferInputSchema.parse(data);
  return dbCreateAccountTransfer(parsed);
}

export async function updateAccountTransfer(
  id: string,
  year: number,
  data: AccountTransferInput
) {
  const { accountTransferInputSchema } = createAccountTransferSchemas(
    (key, params) => translate(getCurrentLanguage(), key, params)
  );
  const parsed = accountTransferInputSchema.parse(data);
  return dbUpdateAccountTransfer(id, year, parsed);
}

export async function deleteAccountTransfer(id: string, year: number) {
  await dbDeleteAccountTransfer(id, year);
}

/**
 * Transazioni sull'altro conto che sembrano la speculare di quella da
 * convertire (cerca anche negli anni adiacenti, per i movimenti a cavallo).
 */
export async function findMirrorCandidates(
  transactionId: string,
  year: number,
  otherAccountId: string
) {
  const lists = await Promise.all(
    [year - 1, year, year + 1].map(async (y) =>
      (await getTransactionsForYear(y)).map((tx) => ({ ...tx, year: y }))
    )
  );
  const all = lists.flat();
  const tx = all.find((item) => item.id === transactionId && item.year === year);
  if (!tx) return [];
  return findMirrorTransactions(tx, otherAccountId, all);
}

export async function convertTransactionToTransfer(params: {
  transactionId: string;
  year: number;
  otherAccountId: string;
  notes: string;
  mirror?: { id: string; year: number };
}) {
  const accounts = await getAccounts();
  if (!accounts.some((account) => account.id === params.otherAccountId)) {
    throw new AppError("errors.accountNotFound");
  }
  return dbConvertTransactionToTransfer(params);
}
