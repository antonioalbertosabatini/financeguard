/**
 * Trasferimenti tra conti nel data layer client-side. Come gli altri moduli di
 * lib/db, operano sul Dataset in memoria (lib/storage/data-store) invece che su
 * file: i trasferimenti vivono in dataset.accountTransfersByYear, partizionati
 * per anno come le transazioni.
 */
import { commit, getDataset } from "@/lib/storage/data-store";
import { generateId, getYearFromDate } from "@/lib/db/index";
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
  if (index === -1) throw new Error("Trasferimento non trovato");

  const updated = accountTransferSchema.parse({
    ...input,
    notes: input.notes ?? "",
    id,
  });
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
  setYearTransfers(
    year,
    getYearTransfers(year).filter((t) => t.id !== id)
  );
}
