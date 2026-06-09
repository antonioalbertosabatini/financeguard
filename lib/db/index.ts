import fs from "fs/promises";
import path from "path";
import { JSONFilePreset } from "lowdb/node";
import { DATA_DIR, TRANSACTIONS_DIR } from "@/lib/constants";

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
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(tempPath, content, "utf-8");
  await fs.rename(tempPath, filePath);
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as T;
}

export async function getDb<T extends object>(
  filePath: string,
  defaultData: T
) {
  await ensureFile(filePath, defaultData);
  return JSONFilePreset<T>(filePath, defaultData);
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
