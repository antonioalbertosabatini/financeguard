import { getAccounts } from "@/lib/db/accounts";
import { getSettings } from "@/lib/db/settings";
import {
  addStockPurchase as dbAddPurchase,
  createStockHolding as dbCreate,
  deleteStockHolding as dbDelete,
  getStockHoldings as dbGetHoldings,
  removeStockPurchase as dbRemovePurchase,
  updateStockHolding as dbUpdate,
} from "@/lib/db/stock-holdings";
import { AppError } from "@/lib/i18n/app-error";
import {
  addStockPurchaseSchema,
  removeStockPurchaseSchema,
  stockHoldingInputSchema,
  type AddStockPurchaseInput,
  type StockHoldingInput,
} from "@/lib/schemas/stock-holding";
import {
  accumulationAsOfISO,
  postedAsOf,
} from "@/lib/utils/accumulation";
import {
  holdingTotals,
  purchasesForYear,
} from "@/lib/utils/stocks";

async function requireSourceAccount(accountId: string) {
  const accounts = await getAccounts();
  const account = accounts.find((item) => item.id === accountId);
  if (!account) throw new AppError("errors.accountNotFound");
  return account;
}

export async function getStockHoldings() {
  return dbGetHoldings();
}

export async function createStockHolding(data: StockHoldingInput) {
  const parsed = stockHoldingInputSchema.parse(data);
  return dbCreate(parsed);
}

export async function updateStockHolding(id: string, data: StockHoldingInput) {
  const parsed = stockHoldingInputSchema.parse(data);
  return dbUpdate(id, parsed);
}

export async function addStockPurchase(id: string, data: AddStockPurchaseInput) {
  const parsed = addStockPurchaseSchema.parse(data);
  await requireSourceAccount(parsed.sourceAccountId);
  return dbAddPurchase(id, parsed);
}

export async function removeStockPurchase(id: string, purchaseId: string) {
  const parsed = removeStockPurchaseSchema.parse({ purchaseId });
  return dbRemovePurchase(id, parsed.purchaseId);
}

export async function deleteStockHolding(id: string) {
  await dbDelete(id);
}

export async function getStockHoldingsPageData(year: number) {
  const [holdings, accounts, settings] = await Promise.all([
    dbGetHoldings(),
    getAccounts(),
    getSettings(),
  ]);

  const asOfISO = accumulationAsOfISO(year);

  const items = holdings.map((holding) => {
    const posted = postedAsOf(purchasesForYear([holding], year), asOfISO);
    const lifetime = holdingTotals(holding, asOfISO);
    const yearTotals = holdingTotals({
      ...holding,
      purchases: (holding.purchases ?? []).filter(
        (item) => item.date.startsWith(String(year)) && item.date <= asOfISO
      ),
    });

    return {
      ...holding,
      invested: lifetime.invested,
      quantity: lifetime.quantity,
      averagePriceCents: lifetime.averagePriceCents,
      yearInvested: yearTotals.invested,
      posted,
    };
  });

  return {
    settings,
    accounts,
    items,
  };
}
