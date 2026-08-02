/**
 * Il `Dataset` e' lo stato dati completo dell'app tenuto in memoria dopo lo
 * sblocco. Sostituisce i file su disco di lib/db: tutto cio' che prima viveva in
 * accounts.json/categories.json/budgets.json/settings.json e nei file annuali
 * delle transazioni qui e' un unico oggetto, cifrato e persistito come bundle
 * (vedi lib/storage/bundle.ts) tramite lo StorageAdapter.
 */
import { DEFAULT_CATEGORIES } from "@/lib/db/seed";
import type { Account } from "@/lib/schemas/account";
import type { AccountTransfer } from "@/lib/schemas/account-transfer";
import type { Budget } from "@/lib/schemas/budget";
import type { Category } from "@/lib/schemas/category";
import type { Instrument } from "@/lib/schemas/instrument";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/schemas/settings";
import type { Trade } from "@/lib/schemas/trade";
import type { Transaction } from "@/lib/schemas/transaction";
import type { SyncMetadata } from "@/lib/sync/sync-metadata";
import { emptySyncMetadata } from "@/lib/sync/sync-metadata";

export interface Dataset {
  accounts: Account[];
  categories: Category[];
  budgets: Budget[];
  /** Titoli, ETF e crypto di cui esiste almeno un'operazione registrata. */
  instruments: Instrument[];
  settings: Settings;
  /** Transazioni raggruppate per anno (chiave = anno come stringa, es. "2026"). */
  transactionsByYear: Record<string, Transaction[]>;
  /** Trasferimenti tra conti raggruppati per anno (chiave = anno come stringa). */
  accountTransfersByYear: Record<string, AccountTransfer[]>;
  /** Acquisti e vendite raggruppati per anno (chiave = anno come stringa). */
  tradesByYear: Record<string, Trade[]>;
  /** Metadati di sync cifrati nel bundle (timestamp per campo, tombstone). */
  syncMeta?: SyncMetadata;
}

/**
 * Dataset iniziale per un nuovo vault: nessun conto/budget/transazione, le
 * categorie di default (come faceva lib/db/categories al primo avvio) e le
 * impostazioni di default.
 */
export function emptyDataset(): Dataset {
  return {
    accounts: [],
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    budgets: [],
    instruments: [],
    settings: { ...DEFAULT_SETTINGS },
    transactionsByYear: {},
    accountTransfersByYear: {},
    tradesByYear: {},
    syncMeta: emptySyncMetadata(),
  };
}

/**
 * I bundle creati prima di una nuova collezione non ne contengono la chiave.
 * Non esiste un numero di versione del dataset, quindi le collezioni mancanti si
 * ripristinano a ogni apertura invece che con una migrazione una tantum.
 */
export function normalizeDataset(dataset: Dataset): Dataset {
  dataset.accounts ??= [];
  dataset.categories ??= [];
  dataset.budgets ??= [];
  dataset.instruments ??= [];
  dataset.transactionsByYear ??= {};
  dataset.accountTransfersByYear ??= {};
  dataset.tradesByYear ??= {};
  return dataset;
}
