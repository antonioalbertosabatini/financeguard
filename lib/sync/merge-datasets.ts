/**
 * Merge client-side zero-knowledge: last-write-wins per campo/record.
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
import { getYearFromDate } from "@/lib/db/index";
import {
  emptySyncMetadata,
  recordKey,
  SETTINGS_RECORD_ID,
  type RecordSyncMeta,
  type SyncEntityType,
  type SyncMetadata,
} from "@/lib/sync/sync-metadata";

function fieldTimestamp(
  meta: RecordSyncMeta | undefined,
  field: string
): string {
  return meta?.fields[field]?.updatedAt ?? meta?.updatedAt ?? "";
}

function mergeField<T extends Record<string, unknown>>(
  local: T,
  remote: T,
  field: string,
  localMeta: RecordSyncMeta | undefined,
  remoteMeta: RecordSyncMeta | undefined
): unknown {
  const localTs = fieldTimestamp(localMeta, field);
  const remoteTs = fieldTimestamp(remoteMeta, field);
  return localTs >= remoteTs ? local[field] : remote[field];
}

function mergeRecordData<T extends Record<string, unknown>>(
  local: T | undefined,
  remote: T | undefined,
  localMeta: RecordSyncMeta | undefined,
  remoteMeta: RecordSyncMeta | undefined
): T | undefined {
  const localDeleted = localMeta?.deletedAt;
  const remoteDeleted = remoteMeta?.deletedAt;

  if (localDeleted && remoteDeleted) return undefined;

  if (localDeleted && !remoteDeleted) {
    const remoteUpdated = remoteMeta?.updatedAt ?? "";
    return remoteUpdated > localDeleted ? remote : undefined;
  }

  if (remoteDeleted && !localDeleted) {
    const localUpdated = localMeta?.updatedAt ?? "";
    return localUpdated > remoteDeleted ? local : undefined;
  }

  if (!local) return remote;
  if (!remote) return local;

  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const merged = { ...remote } as T;
  for (const field of keys) {
    if (field === "id") {
      (merged as Record<string, unknown>).id = local.id ?? remote.id;
      continue;
    }
    (merged as Record<string, unknown>)[field] = mergeField(
      local,
      remote,
      field,
      localMeta,
      remoteMeta
    );
  }
  return merged;
}

function mergeRecordMeta(
  localMeta: RecordSyncMeta | undefined,
  remoteMeta: RecordSyncMeta | undefined,
  mergedExists: boolean
): RecordSyncMeta | undefined {
  if (!mergedExists) {
    const localDeleted = localMeta?.deletedAt;
    const remoteDeleted = remoteMeta?.deletedAt;
    if (!localDeleted && !remoteDeleted) return undefined;
    const localTs = localDeleted ?? "";
    const remoteTs = remoteDeleted ?? "";
    const winner = localTs >= remoteTs ? localMeta : remoteMeta;
    return winner ? { ...winner, deletedAt: winner.deletedAt ?? winner.updatedAt } : undefined;
  }

  const allFields = new Set([
    ...Object.keys(localMeta?.fields ?? {}),
    ...Object.keys(remoteMeta?.fields ?? {}),
  ]);
  const fields: RecordSyncMeta["fields"] = {};
  for (const field of allFields) {
    const localTs = fieldTimestamp(localMeta, field);
    const remoteTs = fieldTimestamp(remoteMeta, field);
    if (localTs >= remoteTs && localMeta?.fields[field]) {
      fields[field] = localMeta.fields[field];
    } else if (remoteMeta?.fields[field]) {
      fields[field] = remoteMeta.fields[field];
    }
  }

  const localUpdated = localMeta?.updatedAt ?? "";
  const remoteUpdated = remoteMeta?.updatedAt ?? "";
  const localWins = localUpdated >= remoteUpdated;

  return {
    updatedAt: localWins ? localUpdated : remoteUpdated,
    deviceId: localWins
      ? (localMeta?.deviceId ?? remoteMeta?.deviceId ?? "")
      : (remoteMeta?.deviceId ?? localMeta?.deviceId ?? ""),
    fields,
  };
}

function mergeSyncMetadata(
  local: SyncMetadata | undefined,
  remote: SyncMetadata | undefined,
  mergedRecords: SyncMetadata["records"]
): SyncMetadata {
  const migratedAt = [local?.migratedAt, remote?.migratedAt]
    .filter(Boolean)
    .sort()
    .pop();
  return {
    version: 1,
    records: mergedRecords,
    migratedAt: migratedAt ?? new Date().toISOString(),
  };
}

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function groupTransactionsByYear(
  transactions: Transaction[]
): Record<string, Transaction[]> {
  const byYear: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    const year = String(getYearFromDate(tx.date));
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(tx);
  }
  return byYear;
}

function groupTransfersByYear(
  transfers: AccountTransfer[]
): Record<string, AccountTransfer[]> {
  const byYear: Record<string, AccountTransfer[]> = {};
  for (const tr of transfers) {
    const year = String(getYearFromDate(tr.date));
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(tr);
  }
  return byYear;
}

function groupTradesByYear(trades: Trade[]): Record<string, Trade[]> {
  const byYear: Record<string, Trade[]> = {};
  for (const trade of trades) {
    const year = String(getYearFromDate(trade.date));
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(trade);
  }
  return byYear;
}

/** Unisce due dataset applicando LWW per campo/record. */
export function mergeDatasets(local: Dataset, remote: Dataset): Dataset {
  const localMeta = local.syncMeta ?? emptySyncMetadata();
  const remoteMeta = remote.syncMeta ?? emptySyncMetadata();

  const allKeys = new Set([
    ...Object.keys(localMeta.records),
    ...Object.keys(remoteMeta.records),
  ]);

  // Include record keys for entities present without metadata (legacy).
  const entityKeys: Array<{ type: SyncEntityType; id: string }> = [
    ...local.accounts.map((a) => ({ type: "account" as const, id: a.id })),
    ...remote.accounts.map((a) => ({ type: "account" as const, id: a.id })),
    ...local.categories.map((c) => ({ type: "category" as const, id: c.id })),
    ...remote.categories.map((c) => ({ type: "category" as const, id: c.id })),
    ...local.budgets.map((b) => ({ type: "budget" as const, id: b.id })),
    ...remote.budgets.map((b) => ({ type: "budget" as const, id: b.id })),
    ...(local.instruments ?? []).map((i) => ({
      type: "instrument" as const,
      id: i.id,
    })),
    ...(remote.instruments ?? []).map((i) => ({
      type: "instrument" as const,
      id: i.id,
    })),
    { type: "settings", id: SETTINGS_RECORD_ID },
  ];

  const localTx = new Map<string, Transaction>();
  const remoteTx = new Map<string, Transaction>();
  for (const year of Object.keys(local.transactionsByYear)) {
    for (const tx of local.transactionsByYear[year] ?? []) {
      localTx.set(tx.id, tx);
      allKeys.add(recordKey("transaction", tx.id));
    }
  }
  for (const year of Object.keys(remote.transactionsByYear)) {
    for (const tx of remote.transactionsByYear[year] ?? []) {
      remoteTx.set(tx.id, tx);
      allKeys.add(recordKey("transaction", tx.id));
    }
  }

  const localTr = new Map<string, AccountTransfer>();
  const remoteTr = new Map<string, AccountTransfer>();
  for (const year of Object.keys(local.accountTransfersByYear)) {
    for (const tr of local.accountTransfersByYear[year] ?? []) {
      localTr.set(tr.id, tr);
      allKeys.add(recordKey("accountTransfer", tr.id));
    }
  }
  for (const year of Object.keys(remote.accountTransfersByYear)) {
    for (const tr of remote.accountTransfersByYear[year] ?? []) {
      remoteTr.set(tr.id, tr);
      allKeys.add(recordKey("accountTransfer", tr.id));
    }
  }

  const localTrades = new Map<string, Trade>();
  const remoteTrades = new Map<string, Trade>();
  for (const year of Object.keys(local.tradesByYear ?? {})) {
    for (const trade of local.tradesByYear[year] ?? []) {
      localTrades.set(trade.id, trade);
      allKeys.add(recordKey("trade", trade.id));
    }
  }
  for (const year of Object.keys(remote.tradesByYear ?? {})) {
    for (const trade of remote.tradesByYear[year] ?? []) {
      remoteTrades.set(trade.id, trade);
      allKeys.add(recordKey("trade", trade.id));
    }
  }

  for (const { type, id } of entityKeys) {
    allKeys.add(recordKey(type, id));
  }

  const localAccounts = indexById(local.accounts);
  const remoteAccounts = indexById(remote.accounts);
  const localCategories = indexById(local.categories);
  const remoteCategories = indexById(remote.categories);
  const localBudgets = indexById(local.budgets);
  const remoteBudgets = indexById(remote.budgets);
  const localInstruments = indexById(local.instruments ?? []);
  const remoteInstruments = indexById(remote.instruments ?? []);

  const mergedRecords: SyncMetadata["records"] = {};
  const accounts: Account[] = [];
  const categories: Category[] = [];
  const budgets: Budget[] = [];
  const instruments: Instrument[] = [];
  const transactions: Transaction[] = [];
  const transfers: AccountTransfer[] = [];
  const trades: Trade[] = [];
  let settings: Settings | undefined;

  for (const key of allKeys) {
    const [type, ...idParts] = key.split(":");
    const id = idParts.join(":");
    const entityType = type as SyncEntityType;
    const lMeta = localMeta.records[key];
    const rMeta = remoteMeta.records[key];

    let merged: Record<string, unknown> | undefined;

    switch (entityType) {
      case "account":
        merged = mergeRecordData(
          localAccounts.get(id) as Record<string, unknown> | undefined,
          remoteAccounts.get(id) as Record<string, unknown> | undefined,
          lMeta,
          rMeta
        );
        if (merged) accounts.push(merged as unknown as Account);
        break;
      case "category":
        merged = mergeRecordData(
          localCategories.get(id) as Record<string, unknown> | undefined,
          remoteCategories.get(id) as Record<string, unknown> | undefined,
          lMeta,
          rMeta
        );
        if (merged) categories.push(merged as unknown as Category);
        break;
      case "budget":
        merged = mergeRecordData(
          localBudgets.get(id) as Record<string, unknown> | undefined,
          remoteBudgets.get(id) as Record<string, unknown> | undefined,
          lMeta,
          rMeta
        );
        if (merged) budgets.push(merged as unknown as Budget);
        break;
      case "transaction":
        merged = mergeRecordData(
          localTx.get(id) as Record<string, unknown> | undefined,
          remoteTx.get(id) as Record<string, unknown> | undefined,
          lMeta,
          rMeta
        );
        if (merged) transactions.push(merged as unknown as Transaction);
        break;
      case "accountTransfer":
        merged = mergeRecordData(
          localTr.get(id) as Record<string, unknown> | undefined,
          remoteTr.get(id) as Record<string, unknown> | undefined,
          lMeta,
          rMeta
        );
        if (merged) transfers.push(merged as unknown as AccountTransfer);
        break;
      case "instrument":
        merged = mergeRecordData(
          localInstruments.get(id) as Record<string, unknown> | undefined,
          remoteInstruments.get(id) as Record<string, unknown> | undefined,
          lMeta,
          rMeta
        );
        if (merged) instruments.push(merged as unknown as Instrument);
        break;
      case "trade":
        merged = mergeRecordData(
          localTrades.get(id) as Record<string, unknown> | undefined,
          remoteTrades.get(id) as Record<string, unknown> | undefined,
          lMeta,
          rMeta
        );
        if (merged) trades.push(merged as unknown as Trade);
        break;
      case "settings":
        merged = mergeRecordData(
          local.settings as unknown as Record<string, unknown>,
          remote.settings as unknown as Record<string, unknown>,
          lMeta,
          rMeta
        );
        if (merged) settings = merged as unknown as Settings;
        break;
    }

    const recordMeta = mergeRecordMeta(lMeta, rMeta, merged !== undefined);
    if (recordMeta) mergedRecords[key] = recordMeta;
  }

  return {
    accounts,
    categories,
    budgets,
    instruments,
    settings: settings ?? local.settings,
    transactionsByYear: groupTransactionsByYear(transactions),
    accountTransfersByYear: groupTransfersByYear(transfers),
    tradesByYear: groupTradesByYear(trades),
    syncMeta: mergeSyncMetadata(localMeta, remoteMeta, mergedRecords),
  };
}

/** True se il merge produrrebbe un dataset diverso dal locale. */
export function datasetsDiffer(a: Dataset, b: Dataset): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}
