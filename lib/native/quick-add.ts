import { createTransaction } from "@/lib/db/transactions";
import { buildQuickAddCatalog } from "@/lib/native/quick-add-catalog";
import {
  parsePendingQuickAddItems,
  partitionPendingQuickAdd,
} from "@/lib/native/quick-add-merge";
import { QuickAdd } from "@/lib/native/quick-add-plugin";
import { getDataset, isUnlocked } from "@/lib/storage/data-store";

export type QuickAddMergeResult = {
  imported: number;
  skipped: number;
};

export async function isQuickAddAvailable(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.getPlatform() !== "android") return false;
    const result = await QuickAdd.isAvailable();
    return result.value === true;
  } catch {
    return false;
  }
}

export async function isQuickAddEnabled(): Promise<boolean> {
  if (!(await isQuickAddAvailable())) return false;
  try {
    const result = await QuickAdd.isEnabled();
    return result.value === true;
  } catch {
    return false;
  }
}

export async function enableQuickAdd(): Promise<void> {
  await QuickAdd.enable();
  await syncQuickAddCatalog();
}

export async function disableQuickAdd(): Promise<void> {
  await QuickAdd.disable();
}

export async function syncQuickAddCatalog(): Promise<void> {
  if (!(await isQuickAddEnabled()) || !isUnlocked()) return;
  const catalog = buildQuickAddCatalog(getDataset());
  await QuickAdd.setCatalog({ catalogJson: JSON.stringify(catalog) });
}

export async function drainAndMergePendingQuickAdd(): Promise<QuickAddMergeResult> {
  const empty: QuickAddMergeResult = { imported: 0, skipped: 0 };
  if (!(await isQuickAddEnabled()) || !isUnlocked()) return empty;

  let rawItems: unknown = [];
  try {
    const drained = await QuickAdd.drainPending();
    rawItems = drained.items;
  } catch {
    return empty;
  }

  const items = parsePendingQuickAddItems(rawItems);
  if (items.length === 0) return empty;

  const dataset = getDataset();
  const accountIds = new Set(dataset.accounts.map((account) => account.id));
  const categoryTypeById = new Map(
    dataset.categories.map((category) => [category.id, category.type])
  );
  const { accepted, skipped } = partitionPendingQuickAdd(
    items,
    accountIds,
    categoryTypeById
  );

  const importedIds: string[] = [];
  for (const item of accepted) {
    try {
      await createTransaction({
        date: item.date,
        amount: item.amount,
        type: item.type,
        categoryId: item.categoryId,
        accountId: item.accountId,
        notes: "",
        tags: [],
        isRecurring: false,
      });
      importedIds.push(item.id);
    } catch {
      skipped.push(item);
    }
  }

  const doneIds = [...importedIds, ...skipped.map((item) => item.id)];
  if (doneIds.length > 0) {
    try {
      await QuickAdd.clearPending({ ids: doneIds });
    } catch {
      // La coda resta: al prossimo sblocco si ritenta. createTransaction è
      // idempotente solo a livello di nuovo id tx_*, quindi un crash qui può
      // duplicare; la finestra è il giro di unlock.
    }
  }

  return { imported: importedIds.length, skipped: skipped.length };
}
