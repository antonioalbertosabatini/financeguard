/**
 * Acquisti e vendite nel data layer client-side. Vivono in dataset.tradesByYear,
 * partizionati per anno come transazioni e trasferimenti.
 */
import { commit, getDataset, getDeviceId } from "@/lib/storage/data-store";
import { AppError } from "@/lib/i18n/app-error";
import { generateId, getYearFromDate } from "@/lib/db/index";
import { trackDelete, trackTradeUpsert } from "@/lib/sync/sync-metadata";
import {
  tradeSchema,
  tradesFileSchema,
  type Trade,
  type TradeInput,
} from "@/lib/schemas/trade";

function getYearTrades(year: number): Trade[] {
  return getDataset().tradesByYear[String(year)] ?? [];
}

function setYearTrades(year: number, trades: Trade[]): void {
  getDataset().tradesByYear[String(year)] = trades;
  commit();
}

/** Anni che hanno operazioni nel dataset, dal piu' recente. */
export async function listTradeYears(): Promise<number[]> {
  return Object.keys(getDataset().tradesByYear)
    .map((year) => parseInt(year, 10))
    .filter((year) => !Number.isNaN(year))
    .sort((a, b) => b - a);
}

export async function getTradesForYear(year: number): Promise<Trade[]> {
  return tradesFileSchema.parse({ trades: getYearTrades(year) }).trades;
}

/**
 * Tutte le operazioni di sempre, ordinate per data. Il portafoglio corrente
 * dipende dall'intera storia, non dall'anno selezionato in UI.
 */
export async function getAllTrades(): Promise<Trade[]> {
  const years = await listTradeYears();
  const all: Trade[] = [];
  for (const year of years) {
    all.push(...(await getTradesForYear(year)));
  }
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

export async function createTrade(input: TradeInput): Promise<Trade> {
  const trade = tradeSchema.parse({
    ...input,
    notes: input.notes ?? "",
    feesCents: input.feesCents ?? 0,
    id: generateId("trd"),
  });
  trackTradeUpsert(getDataset(), trade, getDeviceId());
  const year = getYearFromDate(trade.date);
  setYearTrades(year, [...getYearTrades(year), trade]);
  return trade;
}

export async function updateTrade(
  id: string,
  year: number,
  input: TradeInput
): Promise<Trade> {
  const list = [...getYearTrades(year)];
  const index = list.findIndex((t) => t.id === id);
  if (index === -1) throw new AppError("errors.tradeNotFound");

  const previous = list[index];
  const updated = tradeSchema.parse({
    ...input,
    notes: input.notes ?? "",
    feesCents: input.feesCents ?? 0,
    id,
  });
  trackTradeUpsert(getDataset(), updated, getDeviceId(), previous);
  const newYear = getYearFromDate(updated.date);

  if (newYear === year) {
    list[index] = updated;
    setYearTrades(year, list);
  } else {
    list.splice(index, 1);
    setYearTrades(year, list);
    setYearTrades(newYear, [...getYearTrades(newYear), updated]);
  }
  return updated;
}

export async function deleteTrade(id: string, year: number): Promise<void> {
  trackDelete(getDataset(), "trade", id, getDeviceId());
  setYearTrades(
    year,
    getYearTrades(year).filter((t) => t.id !== id)
  );
}
