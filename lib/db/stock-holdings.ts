import { commit, getDataset, getDeviceId } from "@/lib/storage/data-store";
import { AppError } from "@/lib/i18n/app-error";
import {
  trackDelete,
  trackStockHoldingUpsert,
} from "@/lib/sync/sync-metadata";
import {
  stockHoldingSchema,
  stockHoldingsFileSchema,
  type AddStockPurchaseInput,
  type StockHolding,
  type StockHoldingInput,
} from "@/lib/schemas/stock-holding";
import { generateId } from "@/lib/db/index";

export async function getStockHoldings(): Promise<StockHolding[]> {
  return stockHoldingsFileSchema.parse({
    stockHoldings: getDataset().stockHoldings ?? [],
  }).stockHoldings;
}

export async function createStockHolding(
  input: StockHoldingInput
): Promise<StockHolding> {
  const holding = stockHoldingSchema.parse({
    ...input,
    id: generateId("stk"),
    purchases: [],
  });
  const dataset = getDataset();
  dataset.stockHoldings.push(holding);
  trackStockHoldingUpsert(dataset, holding, getDeviceId());
  commit();
  return holding;
}

export async function updateStockHolding(
  id: string,
  input: StockHoldingInput
): Promise<StockHolding> {
  const holdings = getDataset().stockHoldings;
  const index = holdings.findIndex((holding) => holding.id === id);
  if (index === -1) throw new AppError("errors.holdingNotFound");
  const previous = holdings[index];
  const updated = stockHoldingSchema.parse({
    ...input,
    id,
    purchases: previous.purchases ?? [],
  });
  holdings[index] = updated;
  trackStockHoldingUpsert(getDataset(), updated, getDeviceId(), previous);
  commit();
  return updated;
}

export async function addStockPurchase(
  id: string,
  input: AddStockPurchaseInput
): Promise<StockHolding> {
  const holdings = getDataset().stockHoldings;
  const index = holdings.findIndex((holding) => holding.id === id);
  if (index === -1) throw new AppError("errors.holdingNotFound");
  const previous = holdings[index];
  const purchase = {
    id: generateId("skp"),
    date: input.date,
    amount: input.amount,
    quantity: input.quantity,
    sourceAccountId: input.sourceAccountId,
  };
  const updated = stockHoldingSchema.parse({
    ...previous,
    purchases: [...(previous.purchases ?? []), purchase],
  });
  holdings[index] = updated;
  trackStockHoldingUpsert(getDataset(), updated, getDeviceId(), previous);
  commit();
  return updated;
}

export async function removeStockPurchase(
  id: string,
  purchaseId: string
): Promise<StockHolding> {
  const holdings = getDataset().stockHoldings;
  const index = holdings.findIndex((holding) => holding.id === id);
  if (index === -1) throw new AppError("errors.holdingNotFound");
  const previous = holdings[index];
  const purchases = previous.purchases ?? [];
  if (!purchases.some((item) => item.id === purchaseId)) {
    return previous;
  }
  const updated = stockHoldingSchema.parse({
    ...previous,
    purchases: purchases.filter((item) => item.id !== purchaseId),
  });
  holdings[index] = updated;
  trackStockHoldingUpsert(getDataset(), updated, getDeviceId(), previous);
  commit();
  return updated;
}

export async function deleteStockHolding(id: string): Promise<void> {
  const dataset = getDataset();
  const exists = dataset.stockHoldings.some((holding) => holding.id === id);
  if (!exists) throw new AppError("errors.holdingNotFound");
  dataset.stockHoldings = dataset.stockHoldings.filter(
    (holding) => holding.id !== id
  );
  trackDelete(dataset, "stockHolding", id, getDeviceId());
  commit();
}
