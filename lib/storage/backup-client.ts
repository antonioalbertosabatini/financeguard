/**
 * Backup/ripristino lato client (sostituisce le vecchie API route /api/export*
 * e /api/import*). Usa JSZip + la crittografia web (web-crypto) per produrre e
 * leggere archivi ZIP nello stesso formato della versione server, cosi' i backup
 * restano compatibili tra le due:
 *
 *   data/accounts.json, data/categories.json, data/budgets.json,
 *   data/instruments.json, data/settings.json, data/transactions/<anno>.json,
 *   data/account-transfers/<anno>.json, data/trades/<anno>.json
 *
 * In chiaro questi file sono JSON leggibili; nel backup criptato sono envelope
 * cifrati e l'archivio include anche vault.json.
 */
import JSZip from "jszip";
import { AppError } from "@/lib/i18n/app-error";
import {
  createVaultWeb,
  decryptJsonWeb,
  encryptJsonWeb,
  verifyVaultPasswordWeb,
  type VaultFile,
} from "@/lib/crypto/web-crypto";
import { accountsFileSchema } from "@/lib/schemas/account";
import { accountTransfersFileSchema } from "@/lib/schemas/account-transfer";
import { budgetsFileSchema } from "@/lib/schemas/budget";
import { parseCategoriesFile } from "@/lib/schemas/category";
import { instrumentsFileSchema } from "@/lib/schemas/instrument";
import { settingsSchema } from "@/lib/schemas/settings";
import { tradesFileSchema } from "@/lib/schemas/trade";
import { transactionsFileSchema } from "@/lib/schemas/transaction";
import { emptyDataset, type Dataset } from "@/lib/storage/dataset";

const ROOT = "data";
const TX_DIR = `${ROOT}/transactions`;
const TRF_DIR = `${ROOT}/account-transfers`;
const TRADE_DIR = `${ROOT}/trades`;

function datasetToFiles(dataset: Dataset): Record<string, unknown> {
  const files: Record<string, unknown> = {
    [`${ROOT}/accounts.json`]: { accounts: dataset.accounts },
    [`${ROOT}/categories.json`]: { categories: dataset.categories },
    [`${ROOT}/budgets.json`]: { budgets: dataset.budgets },
    [`${ROOT}/instruments.json`]: { instruments: dataset.instruments },
    [`${ROOT}/settings.json`]: dataset.settings,
  };
  for (const [year, transactions] of Object.entries(dataset.transactionsByYear)) {
    files[`${TX_DIR}/${year}.json`] = { transactions };
  }
  for (const [year, transfers] of Object.entries(
    dataset.accountTransfersByYear
  )) {
    files[`${TRF_DIR}/${year}.json`] = { transfers };
  }
  for (const [year, trades] of Object.entries(dataset.tradesByYear)) {
    files[`${TRADE_DIR}/${year}.json`] = { trades };
  }
  return files;
}

/** ZIP in chiaro: JSON leggibili, nessuna crittografia. */
export async function buildPlainBackup(dataset: Dataset): Promise<Blob> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(datasetToFiles(dataset))) {
    zip.file(path, JSON.stringify(content, null, 2));
  }
  return zip.generateAsync({ type: "blob" });
}

/** ZIP criptato con una password dedicata + vault.json per il ripristino. */
export async function buildEncryptedBackup(
  dataset: Dataset,
  password: string
): Promise<Blob> {
  const { vault, key } = await createVaultWeb(password);
  const zip = new JSZip();
  zip.file("vault.json", JSON.stringify(vault, null, 2));
  for (const [path, content] of Object.entries(datasetToFiles(dataset))) {
    zip.file(path, await encryptJsonWeb(content, key));
  }
  return zip.generateAsync({ type: "blob" });
}

async function filesToDataset(
  read: (path: string) => Promise<unknown | null>
): Promise<Dataset> {
  const dataset = emptyDataset();

  const accounts = await read(`${ROOT}/accounts.json`);
  if (accounts) dataset.accounts = accountsFileSchema.parse(accounts).accounts;

  const categories = await read(`${ROOT}/categories.json`);
  if (categories) dataset.categories = parseCategoriesFile(categories);

  const budgets = await read(`${ROOT}/budgets.json`);
  if (budgets) dataset.budgets = budgetsFileSchema.parse(budgets).budgets;

  const instruments = await read(`${ROOT}/instruments.json`);
  if (instruments) {
    dataset.instruments = instrumentsFileSchema.parse(instruments).instruments;
  }

  const settings = await read(`${ROOT}/settings.json`);
  if (settings) dataset.settings = settingsSchema.parse(settings);

  return dataset;
}

async function readYearFolder(
  zip: JSZip,
  folder: string,
  parse: (text: string) => Promise<unknown>
): Promise<Record<string, unknown>> {
  const years: Record<string, unknown> = {};
  const entries = zip.folder(folder);
  if (!entries) return years;
  const tasks: Promise<void>[] = [];
  entries.forEach((relativePath, file) => {
    const match = relativePath.match(/^(\d{4})\.json$/);
    if (!match || file.dir) return;
    tasks.push(
      (async () => {
        years[match[1]] = await parse(await file.async("string"));
      })()
    );
  });
  await Promise.all(tasks);
  return years;
}

/** Import in chiaro: legge i JSON e ricostruisce il dataset. */
export async function readPlainBackup(file: File): Promise<Dataset> {
  const zip = await JSZip.loadAsync(file);
  const dataset = await filesToDataset(async (path) => {
    const entry = zip.file(path);
    return entry ? JSON.parse(await entry.async("string")) : null;
  });

  const rawYears = await readYearFolder(zip, TX_DIR, async (text) =>
    JSON.parse(text)
  );
  for (const [year, raw] of Object.entries(rawYears)) {
    dataset.transactionsByYear[year] = transactionsFileSchema.parse(
      raw
    ).transactions;
  }

  const rawTransfers = await readYearFolder(zip, TRF_DIR, async (text) =>
    JSON.parse(text)
  );
  for (const [year, raw] of Object.entries(rawTransfers)) {
    dataset.accountTransfersByYear[year] = accountTransfersFileSchema.parse(
      raw
    ).transfers;
  }

  const rawTrades = await readYearFolder(zip, TRADE_DIR, async (text) =>
    JSON.parse(text)
  );
  for (const [year, raw] of Object.entries(rawTrades)) {
    dataset.tradesByYear[year] = tradesFileSchema.parse(raw).trades;
  }
  return dataset;
}

/** Import criptato: verifica la password sul vault e decifra gli envelope. */
export async function readEncryptedBackup(
  file: File,
  password: string
): Promise<Dataset> {
  const zip = await JSZip.loadAsync(file);
  const vaultEntry = zip.file("vault.json");
  if (!vaultEntry) {
    throw new AppError("errors.invalidEncryptedBackup");
  }
  const vault = JSON.parse(await vaultEntry.async("string")) as VaultFile;
  const key = await verifyVaultPasswordWeb(vault, password);
  if (!key) throw new AppError("errors.wrongBackupPassword");

  const dataset = await filesToDataset(async (path) => {
    const entry = zip.file(path);
    return entry ? decryptJsonWeb(await entry.async("string"), key) : null;
  });

  const rawYears = await readYearFolder(zip, TX_DIR, async (text) =>
    decryptJsonWeb(text, key)
  );
  for (const [year, raw] of Object.entries(rawYears)) {
    dataset.transactionsByYear[year] = transactionsFileSchema.parse(
      raw
    ).transactions;
  }

  const rawTransfers = await readYearFolder(zip, TRF_DIR, async (text) =>
    decryptJsonWeb(text, key)
  );
  for (const [year, raw] of Object.entries(rawTransfers)) {
    dataset.accountTransfersByYear[year] = accountTransfersFileSchema.parse(
      raw
    ).transfers;
  }

  const rawTrades = await readYearFolder(zip, TRADE_DIR, async (text) =>
    decryptJsonWeb(text, key)
  );
  for (const [year, raw] of Object.entries(rawTrades)) {
    dataset.tradesByYear[year] = tradesFileSchema.parse(raw).trades;
  }
  return dataset;
}
