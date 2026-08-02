/**
 * Metadati di sincronizzazione cifrati nel bundle (zero-knowledge).
 * Traccia timestamp per campo/record e tombstone per eliminazioni.
 */
import type { Account } from "@/lib/schemas/account";
import type { AccountTransfer } from "@/lib/schemas/account-transfer";
import type { Budget } from "@/lib/schemas/budget";
import type { Category } from "@/lib/schemas/category";
import type { Instrument } from "@/lib/schemas/instrument";
import type { Settings } from "@/lib/schemas/settings";
import type { Trade } from "@/lib/schemas/trade";
import type { Transaction } from "@/lib/schemas/transaction";
import type { Dataset } from "@/lib/storage/dataset";

export const SYNC_META_VERSION = 1 as const;
export const SETTINGS_RECORD_ID = "settings";

export type SyncEntityType =
  | "account"
  | "category"
  | "budget"
  | "transaction"
  | "accountTransfer"
  | "instrument"
  | "trade"
  | "settings";

export interface FieldTimestamp {
  updatedAt: string;
  deviceId: string;
}

export interface RecordSyncMeta {
  updatedAt: string;
  deviceId: string;
  deletedAt?: string;
  fields: Record<string, FieldTimestamp>;
}

export interface SyncMetadata {
  version: typeof SYNC_META_VERSION;
  records: Record<string, RecordSyncMeta>;
  migratedAt?: string;
}

export function recordKey(type: SyncEntityType, id: string): string {
  return `${type}:${id}`;
}

export function emptySyncMetadata(): SyncMetadata {
  return { version: SYNC_META_VERSION, records: {} };
}

function nowIso(): string {
  return new Date().toISOString();
}

function ensureSyncMeta(dataset: Dataset): SyncMetadata {
  if (!dataset.syncMeta || dataset.syncMeta.version !== SYNC_META_VERSION) {
    dataset.syncMeta = emptySyncMetadata();
  }
  return dataset.syncMeta;
}

function stampAllFields(
  data: Record<string, unknown>,
  at: string,
  deviceId: string
): Record<string, FieldTimestamp> {
  const fields: Record<string, FieldTimestamp> = {};
  for (const key of Object.keys(data)) {
    if (key === "id") continue;
    fields[key] = { updatedAt: at, deviceId };
  }
  return fields;
}

function diffFields(
  previous: Record<string, unknown> | undefined,
  next: Record<string, unknown>,
  at: string,
  deviceId: string,
  existing?: Record<string, FieldTimestamp>
): Record<string, FieldTimestamp> {
  const fields: Record<string, FieldTimestamp> = { ...(existing ?? {}) };
  for (const key of Object.keys(next)) {
    if (key === "id") continue;
    const prevVal = previous ? JSON.stringify(previous[key]) : undefined;
    const nextVal = JSON.stringify(next[key]);
    if (prevVal !== nextVal || !fields[key]) {
      fields[key] = { updatedAt: at, deviceId };
    }
  }
  return fields;
}

/** Marca un record creato o aggiornato. */
export function trackUpsert(
  dataset: Dataset,
  type: SyncEntityType,
  id: string,
  data: Record<string, unknown>,
  deviceId: string,
  previous?: Record<string, unknown>
): void {
  const meta = ensureSyncMeta(dataset);
  const key = recordKey(type, id);
  const at = nowIso();
  const existing = meta.records[key];
  const fields = previous
    ? diffFields(previous, data, at, deviceId, existing?.fields)
    : stampAllFields(data, at, deviceId);

  meta.records[key] = {
    updatedAt: at,
    deviceId,
    fields,
    deletedAt: undefined,
  };
}

/** Marca un record eliminato (tombstone). */
export function trackDelete(
  dataset: Dataset,
  type: SyncEntityType,
  id: string,
  deviceId: string
): void {
  const meta = ensureSyncMeta(dataset);
  const key = recordKey(type, id);
  const at = nowIso();
  const existing = meta.records[key];
  meta.records[key] = {
    updatedAt: at,
    deviceId,
    deletedAt: at,
    fields: existing?.fields ?? {},
  };
}

function collectEntities(dataset: Dataset): Array<{
  type: SyncEntityType;
  id: string;
  data: Record<string, unknown>;
}> {
  const items: Array<{
    type: SyncEntityType;
    id: string;
    data: Record<string, unknown>;
  }> = [];

  for (const account of dataset.accounts) {
    items.push({
      type: "account",
      id: account.id,
      data: account as unknown as Record<string, unknown>,
    });
  }
  for (const category of dataset.categories) {
    items.push({
      type: "category",
      id: category.id,
      data: category as unknown as Record<string, unknown>,
    });
  }
  for (const budget of dataset.budgets) {
    items.push({
      type: "budget",
      id: budget.id,
      data: budget as unknown as Record<string, unknown>,
    });
  }
  for (const instrument of dataset.instruments ?? []) {
    items.push({
      type: "instrument",
      id: instrument.id,
      data: instrument as unknown as Record<string, unknown>,
    });
  }
  items.push({
    type: "settings",
    id: SETTINGS_RECORD_ID,
    data: dataset.settings as unknown as Record<string, unknown>,
  });

  for (const year of Object.keys(dataset.transactionsByYear)) {
    for (const tx of dataset.transactionsByYear[year] ?? []) {
      items.push({
        type: "transaction",
        id: tx.id,
        data: tx as unknown as Record<string, unknown>,
      });
    }
  }
  for (const year of Object.keys(dataset.accountTransfersByYear)) {
    for (const tr of dataset.accountTransfersByYear[year] ?? []) {
      items.push({
        type: "accountTransfer",
        id: tr.id,
        data: tr as unknown as Record<string, unknown>,
      });
    }
  }
  for (const year of Object.keys(dataset.tradesByYear ?? {})) {
    for (const trade of dataset.tradesByYear[year] ?? []) {
      items.push({
        type: "trade",
        id: trade.id,
        data: trade as unknown as Record<string, unknown>,
      });
    }
  }

  return items;
}

/**
 * Migrazione iniziale: assegna timestamp corrente a tutti i record esistenti
 * che non hanno ancora metadati.
 */
export function migrateSyncMetadataIfNeeded(
  dataset: Dataset,
  deviceId: string
): boolean {
  const meta = ensureSyncMeta(dataset);
  if (meta.migratedAt) return false;

  const at = nowIso();
  for (const { type, id, data } of collectEntities(dataset)) {
    const key = recordKey(type, id);
    if (meta.records[key]) continue;
    meta.records[key] = {
      updatedAt: at,
      deviceId,
      fields: stampAllFields(data, at, deviceId),
    };
  }

  meta.migratedAt = at;
  return true;
}

/**
 * Dopo un import: marca tutti i record locali come appena aggiornati, così
 * eventuali merge futuri danno priorità a questo dataset.
 */
export function stampDatasetAsAuthoritative(
  dataset: Dataset,
  deviceId: string
): void {
  const at = nowIso();
  const meta = emptySyncMetadata();
  meta.migratedAt = at;

  for (const { type, id, data } of collectEntities(dataset)) {
    meta.records[recordKey(type, id)] = {
      updatedAt: at,
      deviceId,
      fields: stampAllFields(data, at, deviceId),
    };
  }

  dataset.syncMeta = meta;
}

/** Helper tipizzati per il data layer. */
export function trackAccountUpsert(
  dataset: Dataset,
  account: Account,
  deviceId: string,
  previous?: Account
): void {
  trackUpsert(
    dataset,
    "account",
    account.id,
    account as unknown as Record<string, unknown>,
    deviceId,
    previous as unknown as Record<string, unknown> | undefined
  );
}

export function trackCategoryUpsert(
  dataset: Dataset,
  category: Category,
  deviceId: string,
  previous?: Category
): void {
  trackUpsert(
    dataset,
    "category",
    category.id,
    category as unknown as Record<string, unknown>,
    deviceId,
    previous as unknown as Record<string, unknown> | undefined
  );
}

export function trackBudgetUpsert(
  dataset: Dataset,
  budget: Budget,
  deviceId: string,
  previous?: Budget
): void {
  trackUpsert(
    dataset,
    "budget",
    budget.id,
    budget as unknown as Record<string, unknown>,
    deviceId,
    previous as unknown as Record<string, unknown> | undefined
  );
}

export function trackSettingsUpsert(
  dataset: Dataset,
  settings: Settings,
  deviceId: string,
  previous?: Settings
): void {
  trackUpsert(
    dataset,
    "settings",
    SETTINGS_RECORD_ID,
    settings as unknown as Record<string, unknown>,
    deviceId,
    previous as unknown as Record<string, unknown> | undefined
  );
}

export function trackTransactionUpsert(
  dataset: Dataset,
  tx: Transaction,
  deviceId: string,
  previous?: Transaction
): void {
  trackUpsert(
    dataset,
    "transaction",
    tx.id,
    tx as unknown as Record<string, unknown>,
    deviceId,
    previous as unknown as Record<string, unknown> | undefined
  );
}

export function trackInstrumentUpsert(
  dataset: Dataset,
  instrument: Instrument,
  deviceId: string,
  previous?: Instrument
): void {
  trackUpsert(
    dataset,
    "instrument",
    instrument.id,
    instrument as unknown as Record<string, unknown>,
    deviceId,
    previous as unknown as Record<string, unknown> | undefined
  );
}

export function trackTradeUpsert(
  dataset: Dataset,
  trade: Trade,
  deviceId: string,
  previous?: Trade
): void {
  trackUpsert(
    dataset,
    "trade",
    trade.id,
    trade as unknown as Record<string, unknown>,
    deviceId,
    previous as unknown as Record<string, unknown> | undefined
  );
}

export function trackTransferUpsert(
  dataset: Dataset,
  tr: AccountTransfer,
  deviceId: string,
  previous?: AccountTransfer
): void {
  trackUpsert(
    dataset,
    "accountTransfer",
    tr.id,
    tr as unknown as Record<string, unknown>,
    deviceId,
    previous as unknown as Record<string, unknown> | undefined
  );
}
