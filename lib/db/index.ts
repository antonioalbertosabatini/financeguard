import fs from "fs/promises";
import path from "path";
import { Low } from "lowdb";
import { DataFile } from "lowdb/node";
import { DATA_DIR, TRANSACTIONS_DIR } from "@/lib/constants";
import { decryptJson, encryptJson } from "@/lib/crypto/cipher";
import { getSessionKey } from "@/lib/crypto/session";

export async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(TRANSACTIONS_DIR, { recursive: true });
}

export async function ensureFile<T extends object>(
  filePath: string,
  defaultData: T
): Promise<void> {
  await ensureDataDir();
  try {
    await fs.access(filePath);
  } catch {
    await writeJsonAtomic(filePath, defaultData);
  }
}

export async function writeJsonAtomic<T>(
  filePath: string,
  data: T
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  const content = encryptJson(data, getSessionKey());
  await fs.writeFile(tempPath, content, "utf-8");
  await fs.rename(tempPath, filePath);
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf-8");
  return decryptJson<T>(content, getSessionKey());
}

export async function getDb<T extends object>(
  filePath: string,
  defaultData: T
) {
  await ensureFile(filePath, defaultData);
  const adapter = new DataFile<T>(filePath, {
    parse: (str: string) => {
      if (str.trim() === "") return defaultData;
      return decryptJson<T>(str, getSessionKey());
    },
    stringify: (data: T) => encryptJson(data, getSessionKey()),
  });
  return new Low<T>(adapter, defaultData);
}

export function getYearFromDate(date: string): number {
  return parseInt(date.slice(0, 4), 10);
}

export function getTransactionFilePath(year: number): string {
  return path.join(TRANSACTIONS_DIR, `${year}.json`);
}

export async function listTransactionYears(): Promise<number[]> {
  await ensureDataDir();
  try {
    const files = await fs.readdir(TRANSACTIONS_DIR);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => parseInt(f.replace(".json", ""), 10))
      .filter((y) => !Number.isNaN(y))
      .sort((a, b) => b - a);
  } catch {
    return [];
  }
}

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}
