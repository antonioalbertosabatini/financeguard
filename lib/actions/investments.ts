import {
  createInstrument as dbCreateInstrument,
  deleteInstrument as dbDeleteInstrument,
  findOrCreateInstrument as dbFindOrCreateInstrument,
  getInstruments as dbGetInstruments,
  updateInstrument as dbUpdateInstrument,
} from "@/lib/db/instruments";
import {
  createTrade as dbCreateTrade,
  deleteTrade as dbDeleteTrade,
  getAllTrades as dbGetAllTrades,
  updateTrade as dbUpdateTrade,
} from "@/lib/db/trades";
import { getAccounts } from "@/lib/db/accounts";
import { getSettings } from "@/lib/db/settings";
import { AppError } from "@/lib/i18n/app-error";
import {
  instrumentInputSchema,
  type Instrument,
  type InstrumentInput,
} from "@/lib/schemas/instrument";
import { tradeInputSchema, type TradeInput } from "@/lib/schemas/trade";
import { buildPositions, type Position } from "@/lib/utils/portfolio";
import { todayISO } from "@/lib/utils/dates";

export async function getInstruments() {
  return dbGetInstruments();
}

export async function getAllTrades() {
  return dbGetAllTrades();
}

export async function createInstrument(data: InstrumentInput) {
  return dbCreateInstrument(instrumentInputSchema.parse(data));
}

export async function findOrCreateInstrument(data: InstrumentInput) {
  return dbFindOrCreateInstrument(instrumentInputSchema.parse(data));
}

export async function updateInstrument(id: string, data: InstrumentInput) {
  return dbUpdateInstrument(id, instrumentInputSchema.parse(data));
}

/** Aggiorna il prezzo inserito a mano, usato quando il provider non copre il titolo. */
export async function setManualPrice(
  id: string,
  price8: number | null
): Promise<Instrument> {
  const instruments = await dbGetInstruments();
  const instrument = instruments.find((item) => item.id === id);
  if (!instrument) throw new AppError("errors.instrumentNotFound");

  return dbUpdateInstrument(id, {
    symbol: instrument.symbol,
    ticker: instrument.ticker,
    name: instrument.name,
    kind: instrument.kind,
    currency: instrument.currency,
    exchange: instrument.exchange,
    isin: instrument.isin,
    manualPrice8: price8,
    manualPriceAt: price8 == null ? null : todayISO(),
  });
}

export async function deleteInstrument(id: string) {
  const trades = await dbGetAllTrades();
  if (trades.some((trade) => trade.instrumentId === id)) {
    throw new AppError("errors.deleteInstrumentWithTrades");
  }
  await dbDeleteInstrument(id);
}

export async function createTrade(data: TradeInput) {
  const parsed = tradeInputSchema.parse(data);
  await assertAccountExists(parsed.accountId);
  return dbCreateTrade(parsed);
}

export async function updateTrade(id: string, year: number, data: TradeInput) {
  const parsed = tradeInputSchema.parse(data);
  await assertAccountExists(parsed.accountId);
  return dbUpdateTrade(id, year, parsed);
}

/**
 * Elimina l'operazione e, se era l'ultima su quello strumento, anche
 * l'anagrafica: un titolo senza operazioni non ha motivo di restare in elenco.
 */
export async function deleteTrade(id: string, year: number) {
  const trades = await dbGetAllTrades();
  const trade = trades.find((item) => item.id === id);
  await dbDeleteTrade(id, year);

  if (!trade) return;
  const remaining = trades.filter(
    (item) => item.instrumentId === trade.instrumentId && item.id !== id
  );
  if (remaining.length === 0) {
    await dbDeleteInstrument(trade.instrumentId);
  }
}

async function assertAccountExists(accountId: string): Promise<void> {
  const accounts = await getAccounts();
  if (!accounts.some((account) => account.id === accountId)) {
    throw new AppError("errors.accountNotFound");
  }
}

export interface InvestmentsData {
  positions: Position[];
  instruments: Instrument[];
  accounts: Awaited<ReturnType<typeof getAccounts>>;
  currency: string;
  locale: string;
}

/**
 * Dati locali della pagina investimenti. Le quotazioni non sono incluse:
 * arrivano dalla rete e vengono caricate a parte, cosi' la pagina resta
 * utilizzabile anche offline.
 */
export async function getInvestmentsData(): Promise<InvestmentsData> {
  const [instruments, trades, accounts, settings] = await Promise.all([
    dbGetInstruments(),
    dbGetAllTrades(),
    getAccounts(),
    getSettings(),
  ]);

  return {
    positions: buildPositions(trades, instruments),
    instruments,
    accounts,
    currency: settings.defaultCurrency,
    locale: settings.locale,
  };
}
