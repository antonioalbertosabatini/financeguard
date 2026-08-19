/**
 * Il `Dataset` e' lo stato dati completo dell'app tenuto in memoria dopo lo
 * sblocco. Sostituisce i file su disco di lib/db: tutto cio' che prima viveva in
 * accounts.json/categories.json/budgets.json/settings.json e nei file annuali
 * delle transazioni qui e' un unico oggetto, cifrato e persistito come bundle
 * (vedi lib/storage/bundle.ts) tramite lo StorageAdapter.
 */
import { DEFAULT_CATEGORIES } from "@/lib/db/seed";
import {
  assignAccountOrders,
  type Account,
} from "@/lib/schemas/account";
import type { AccumulationPlan } from "@/lib/schemas/accumulation-plan";
import type { AccountTransfer } from "@/lib/schemas/account-transfer";
import type { Budget } from "@/lib/schemas/budget";
import type { Category } from "@/lib/schemas/category";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/schemas/settings";
import type { Transaction } from "@/lib/schemas/transaction";
import type { SyncMetadata } from "@/lib/sync/sync-metadata";
import { emptySyncMetadata } from "@/lib/sync/sync-metadata";

export interface Dataset {
  accounts: Account[];
  categories: Category[];
  budgets: Budget[];
  settings: Settings;
  /** Transazioni raggruppate per anno (chiave = anno come stringa, es. "2026"). */
  transactionsByYear: Record<string, Transaction[]>;
  /** Trasferimenti tra conti raggruppati per anno (chiave = anno come stringa). */
  accountTransfersByYear: Record<string, AccountTransfer[]>;
  /** Piani di accumulo (entità lunga durata, non partizionata per anno). */
  accumulationPlans: AccumulationPlan[];
  /** Metadati di sync cifrati nel bundle (timestamp per campo, tombstone). */
  syncMeta?: SyncMetadata;
}

/** Completa campi introdotti dopo il primo vault, mutando in place. */
export function normalizeDataset(dataset: Dataset): Dataset {
  if (!dataset.accumulationPlans) {
    dataset.accumulationPlans = [];
  }
  if (Array.isArray(dataset.accounts)) {
    dataset.accounts = assignAccountOrders(dataset.accounts);
  }
  return dataset;
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
    settings: {
      ...DEFAULT_SETTINGS,
      incomeAllocation: {
        percents: { ...DEFAULT_SETTINGS.incomeAllocation.percents },
        incomeCategoryIds: [
          ...DEFAULT_SETTINGS.incomeAllocation.incomeCategoryIds,
        ],
      },
      incomeAllocationAssignments: {},
    },
    transactionsByYear: {},
    accountTransfersByYear: {},
    accumulationPlans: [],
    syncMeta: emptySyncMetadata(),
  };
}
