import path from "path";
import fs from "fs/promises";
import {
  generateId,
  getDb,
  getYearFromDate,
} from "@/lib/db/index";
import { ACCOUNT_TRANSFERS_DIR } from "@/lib/constants";
import {
  accountTransferSchema,
  accountTransfersFileSchema,
  type AccountTransfer,
  type AccountTransferInput,
} from "@/lib/schemas/account-transfer";

const DEFAULT = { transfers: [] as AccountTransfer[] };

export function getAccountTransfersFilePath(year: number): string {
  return path.join(ACCOUNT_TRANSFERS_DIR, `${year}.json`);
}

export async function listAccountTransferYears(): Promise<number[]> {
  try {
    const files = await fs.readdir(ACCOUNT_TRANSFERS_DIR);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => parseInt(f.replace(".json", ""), 10))
      .filter((y) => !Number.isNaN(y))
      .sort((a, b) => b - a);
  } catch {
    return [];
  }
}

export async function getAccountTransfersForYear(
  year: number
): Promise<AccountTransfer[]> {
  const filePath = getAccountTransfersFilePath(year);
  const db = await getDb(filePath, DEFAULT);
  await db.read();
  return accountTransfersFileSchema.parse(db.data).transfers;
}

export async function getAllAccountTransfers(): Promise<AccountTransfer[]> {
  const years = await listAccountTransferYears();
  const all: AccountTransfer[] = [];
  for (const year of years) {
    const items = await getAccountTransfersForYear(year);
    all.push(...items);
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
  const filePath = getAccountTransfersFilePath(year);
  const db = await getDb(filePath, DEFAULT);
  await db.read();
  db.data.transfers.push(transfer);
  await db.write();
  return transfer;
}

export async function updateAccountTransfer(
  id: string,
  year: number,
  input: AccountTransferInput
): Promise<AccountTransfer> {
  const oldFilePath = getAccountTransfersFilePath(year);
  const db = await getDb(oldFilePath, DEFAULT);
  await db.read();
  const index = db.data.transfers.findIndex((t) => t.id === id);
  if (index === -1) throw new Error("Trasferimento non trovato");

  const updated = accountTransferSchema.parse({
    ...input,
    notes: input.notes ?? "",
    id,
  });
  const newYear = getYearFromDate(updated.date);

  if (newYear === year) {
    db.data.transfers[index] = updated;
    await db.write();
  } else {
    db.data.transfers.splice(index, 1);
    await db.write();
    const newFilePath = getAccountTransfersFilePath(newYear);
    const newDb = await getDb(newFilePath, DEFAULT);
    await newDb.read();
    newDb.data.transfers.push(updated);
    await newDb.write();
  }

  return updated;
}

export async function deleteAccountTransfer(
  id: string,
  year: number
): Promise<void> {
  const filePath = getAccountTransfersFilePath(year);
  const db = await getDb(filePath, DEFAULT);
  await db.read();
  db.data.transfers = db.data.transfers.filter((t) => t.id !== id);
  await db.write();
}

