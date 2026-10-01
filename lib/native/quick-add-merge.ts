import type { QuickAddPendingItem } from "@/lib/native/quick-add-plugin";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type QuickAddMergePartition = {
  accepted: QuickAddPendingItem[];
  skipped: QuickAddPendingItem[];
};

export function parsePendingQuickAddItems(raw: unknown): QuickAddPendingItem[] {
  if (!Array.isArray(raw)) return [];
  const items: QuickAddPendingItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const rec = entry as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id : "";
    const type = rec.type === "income" || rec.type === "expense" ? rec.type : null;
    const categoryId = typeof rec.categoryId === "string" ? rec.categoryId : "";
    const accountId = typeof rec.accountId === "string" ? rec.accountId : "";
    const date = typeof rec.date === "string" ? rec.date : "";
    const amount = typeof rec.amount === "number" ? rec.amount : Number(rec.amount);
    if (!id || !type || !categoryId || !accountId) continue;
    if (!Number.isInteger(amount) || amount <= 0) continue;
    if (!DATE_RE.test(date)) continue;
    items.push({ id, amount, type, categoryId, accountId, date });
  }
  return items;
}

export function partitionPendingQuickAdd(
  items: QuickAddPendingItem[],
  accountIds: Set<string>,
  categoryTypeById: Map<string, string>
): QuickAddMergePartition {
  const accepted: QuickAddPendingItem[] = [];
  const skipped: QuickAddPendingItem[] = [];
  for (const item of items) {
    if (!accountIds.has(item.accountId)) {
      skipped.push(item);
      continue;
    }
    if (categoryTypeById.get(item.categoryId) !== item.type) {
      skipped.push(item);
      continue;
    }
    accepted.push(item);
  }
  return { accepted, skipped };
}
