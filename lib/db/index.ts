import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { Low, type Adapter } from "lowdb";
import { DATA_DIR, TMP_DIR, TRANSACTIONS_DIR } from "@/lib/constants";
import { decryptJson, encryptJson } from "@/lib/crypto/cipher";
import { getSessionKey } from "@/lib/crypto/session";
import { markDataWritten } from "@/lib/db/sync-guard";

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

/**
 * Scrittura robusta rispetto alla sincronizzazione cloud: il file temporaneo
 * viene creato in una sottocartella dedicata (stesso volume di DATA_DIR),
 * forzato su disco con fsync e poi spostato in modo atomico con rename. Questo
 * riduce il rischio che OneDrive sincronizzi un file parziale. Non incrementa
 * la revisione: usala per scritture "raw" (vault, metadati).
 */
export async function writeFileRobust(
  filePath: string,
  content: string
): Promise<void> {
  await fs.mkdir(TMP_DIR, { recursive: true });
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(
    TMP_DIR,
    `${path.basename(filePath)}.${crypto.randomUUID()}.tmp`
  );
  const fh = await fs.open(tempPath, "w");
  try {
    await fh.writeFile(content, "utf-8");
    await fh.sync();
  } finally {
    await fh.close();
  }
  await fs.rename(tempPath, filePath);
}

export async function writeJsonAtomic<T>(
  filePath: string,
  data: T
): Promise<void> {
  const content = encryptJson(data, getSessionKey());
  await writeFileRobust(filePath, content);
  await markDataWritten();
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf-8");
  return decryptJson<T>(content, getSessionKey());
}

class EncryptedAdapter<T> implements Adapter<T> {
  constructor(
    private readonly filePath: string,
    private readonly defaultData: T
  ) {}

  async read(): Promise<T | null> {
    let content: string;
    try {
      content = await fs.readFile(this.filePath, "utf-8");
    } catch {
      return null;
    }
    if (content.trim() === "") return this.defaultData;
    return decryptJson<T>(content, getSessionKey());
  }

  async write(data: T): Promise<void> {
    await writeJsonAtomic(this.filePath, data);
  }
}

export async function getDb<T extends object>(
  filePath: string,
  defaultData: T
) {
  await ensureFile(filePath, defaultData);
  return new Low<T>(new EncryptedAdapter<T>(filePath, defaultData), defaultData);
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
