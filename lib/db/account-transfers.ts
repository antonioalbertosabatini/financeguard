/**
 * Trasferimenti tra conti nel data layer client-side. Come gli altri moduli di
 * lib/db, operano sul Dataset in memoria (lib/storage/data-store) invece che su
 * file: i trasferimenti vivono in dataset.accountTransfersByYear, partizionati
 * per anno come le transazioni.
 */
import { commit, getDataset, getDeviceId } from "@/lib/storage/data-store";
import { AppError } from "@/lib/i18n/app-error";
import {
  generateId,
  getYearFromDate,
  getYearTransactions,
} from "@/lib/db/index";
import {
  trackDelete,
  trackTransferUpsert,
} from "@/lib/sync/sync-metadata";
import {
  isConvertibleToTransfer,
  transferDirection,
} from "@/lib/utils/transfer-conversion";
import {
  accountTransferSchema,
  accountTransfersFileSchema,
  type AccountTransfer,
  type AccountTransferInput,
} from "@/lib/schemas/account-transfer";

/** Trasferimenti dell'anno (array vuoto se l'anno non esiste ancora). */
function getYearTransfers(year: number): AccountTransfer[] {
  return getDataset().accountTransfersByYear[String(year)] ?? [];
}

/** Sostituisce i trasferimenti dell'anno e segnala la mutazione (persist). */
function setYearTransfers(year: number, transfers: AccountTransfer[]): void {
  getDataset().accountTransfersByYear[String(year)] = transfers;
  commit();
}

/** Anni che hanno trasferimenti nel dataset, dal piu' recente. */
export async function listAccountTransferYears(): Promise<number[]> {
  return Object.keys(getDataset().accountTransfersByYear)
    .map((year) => parseInt(year, 10))
    .filter((year) => !Number.isNaN(year))
    .sort((a, b) => b - a);
}

export async function getAccountTransfersForYear(
  year: number
): Promise<AccountTransfer[]> {
  return accountTransfersFileSchema.parse({ transfers: getYearTransfers(year) })
    .transfers;
}

export async function getAllAccountTransfers(): Promise<AccountTransfer[]> {
  const years = await listAccountTransferYears();
  const all: AccountTransfer[] = [];
  for (const year of years) {
    all.push(...(await getAccountTransfersForYear(year)));
  }
  return all;
}

export async function createAccountTransfer(
  input: AccountTransferInput
): Promise<AccountTransfer> {
  const transfer = accountTransferSchema.parse({
    ...input,
    notes: input.notes ?? "",
    id: generateId("trf"),
  });
  trackTransferUpsert(getDataset(), transfer, getDeviceId());
  const year = getYearFromDate(transfer.date);
  setYearTransfers(year, [...getYearTransfers(year), transfer]);
  return transfer;
}

export async function updateAccountTransfer(
  id: string,
  year: number,
  input: AccountTransferInput
): Promise<AccountTransfer> {
  const list = [...getYearTransfers(year)];
  const index = list.findIndex((t) => t.id === id);
  if (index === -1) throw new AppError("errors.transferNotFound");

  const previous = list[index];
  const updated = accountTransferSchema.parse({
    ...input,
    notes: input.notes ?? "",
    externalIds: input.externalIds ?? previous.externalIds,
    id,
  });
  trackTransferUpsert(getDataset(), updated, getDeviceId(), previous);
  const newYear = getYearFromDate(updated.date);

  if (newYear === year) {
    list[index] = updated;
    setYearTransfers(year, list);
  } else {
    list.splice(index, 1);
    setYearTransfers(year, list);
    setYearTransfers(newYear, [...getYearTransfers(newYear), updated]);
  }
  return updated;
}

export async function deleteAccountTransfer(
  id: string,
  year: number
): Promise<void> {
  trackDelete(getDataset(), "accountTransfer", id, getDeviceId());
  setYearTransfers(
    year,
    getYearTransfers(year).filter((t) => t.id !== id)
  );
}

/**
 * Converte un'entrata/uscita in trasferimento: crea il trasferimento (stessa
 * data, importo e note) ed elimina la transazione e, se indicata, la sua
 * speculare sull'altro conto. Tutto in un'unica mutazione del dataset.
 */
export async function convertTransactionToTransfer(params: {
  transactionId: string;
  year: number;
  otherAccountId: string;
  notes: string;
  mirror?: { id: string; year: number };
}): Promise<AccountTransfer> {
  const dataset = getDataset();
  const deviceId = getDeviceId();
  const tx = getYearTransactions(params.year).find(
    (item) => item.id === params.transactionId
  );
  if (!tx) throw new AppError("errors.transactionNotFound");
  if (!isConvertibleToTransfer(tx)) {
    throw new AppError("errors.transactionNotConvertible");
  }

  let mirror: (typeof tx) | undefined;
  if (params.mirror) {
    mirror = getYearTransactions(params.mirror.year).find(
      (item) => item.id === params.mirror?.id
    );
    if (!mirror || mirror.accountId !== params.otherAccountId) {
      throw new AppError("errors.transactionNotFound");
    }
  }

  const externalIds = [tx.externalId, mirror?.externalId].filter(
    (id): id is string => Boolean(id)
  );
  const transfer = accountTransferSchema.parse({
    id: generateId("trf"),
    date: tx.date,
    amount: tx.amount,
    ...transferDirection(tx, params.otherAccountId),
    notes: params.notes,
    ...(externalIds.length > 0 ? { externalIds } : {}),
  });

  trackTransferUpsert(dataset, transfer, deviceId);
  const transferYear = getYearFromDate(transfer.date);
  dataset.accountTransfersByYear[String(transferYear)] = [
    ...getYearTransfers(transferYear),
    transfer,
  ];

  const removals = [{ id: tx.id, year: params.year }];
  if (mirror && params.mirror) removals.push(params.mirror);
  for (const removal of removals) {
    trackDelete(dataset, "transaction", removal.id, deviceId);
    dataset.transactionsByYear[String(removal.year)] = getYearTransactions(
      removal.year
    ).filter((item) => item.id !== removal.id);
  }

  commit();
  return transfer;
}
