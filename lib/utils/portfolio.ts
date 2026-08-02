/**
 * Derivazione del portafoglio dalle operazioni registrate.
 *
 * Le posizioni non sono salvate: si ricostruiscono a runtime dai lotti, come le
 * transazioni ricorrenti si espandono da lib/utils/recurrence. Il costo di
 * carico e' quello effettivamente uscito dal conto (commissioni incluse), cosi'
 * la plusvalenza riflette il risultato reale e non quello teorico.
 */
import { LOT_MATCHING } from "@/lib/constants";
import type { Instrument } from "@/lib/schemas/instrument";
import type { Trade } from "@/lib/schemas/trade";
import { grossValueCents, unitPriceFromCents } from "@/lib/utils/quantity";

/** Quotazione normalizzata, da provider o inserita a mano. */
export interface Quote {
  price8: number;
  currency: string;
  /** Momento a cui si riferisce il prezzo, non quello dello scaricamento. */
  asOf: string;
  source: "provider" | "manual";
}

export type QuoteMap = Record<string, Quote>;

/** Quante unita' di valuta valgono un euro (come le restituisce la BCE). */
export type FxRates = Record<string, number>;

export interface OpenLot {
  tradeId: string;
  date: string;
  /** Quantita' ancora in portafoglio di questo lotto. */
  quantity8: number;
  /** Costo residuo del lotto in centesimi di euro. */
  costCents: number;
}

export interface Position {
  instrument: Instrument;
  quantity8: number;
  /** Costo di carico complessivo delle quote ancora possedute, in euro. */
  costCents: number;
  /** Costo medio unitario in euro, scalato 1e8. */
  averageCost8: number;
  /** Plus/minusvalenze gia' realizzate con le vendite, in euro. */
  realizedCents: number;
  lots: OpenLot[];
  trades: Trade[];
}

export interface ValuedPosition extends Position {
  quote: Quote | null;
  /** Controvalore in euro, null se manca la quotazione. */
  valueCents: number | null;
  /** Plusvalenza latente in euro, null se manca la quotazione. */
  unrealizedCents: number | null;
  /** Variazione percentuale sul costo, null se manca la quotazione. */
  unrealizedPercent: number | null;
}

export interface PortfolioSummary {
  positions: ValuedPosition[];
  /** Costo di carico totale delle posizioni aperte. */
  costCents: number;
  /** Controvalore totale: esclude le posizioni senza quotazione. */
  valueCents: number;
  unrealizedCents: number;
  realizedCents: number;
  /** True se almeno una posizione non ha un prezzo disponibile. */
  hasMissingQuotes: boolean;
}

/**
 * Le piazze londinesi quotano in penny ma dichiarano la valuta come GBp/GBX:
 * senza questa correzione i valori risulterebbero cento volte piu' alti.
 */
function currencyFactor(currency: string): { code: string; divisor: number } {
  const upper = currency.toUpperCase();
  if (upper === "GBP" && currency !== "GBP") return { code: "GBP", divisor: 100 };
  if (upper === "GBX") return { code: "GBP", divisor: 100 };
  if (upper === "ZAC") return { code: "ZAR", divisor: 100 };
  return { code: upper, divisor: 1 };
}

/**
 * Converte un importo in centesimi dalla valuta di quotazione all'euro.
 * Restituisce null se il tasso non e' disponibile: meglio non mostrare nulla
 * che mostrare un totale sbagliato.
 */
export function convertToBaseCents(
  cents: number,
  currency: string,
  rates: FxRates
): number | null {
  const { code, divisor } = currencyFactor(currency);
  if (code === "EUR") return Math.round(cents / divisor);
  const rate = rates[code];
  if (!rate) return null;
  return Math.round(cents / divisor / rate);
}

function consumeLots(
  lots: OpenLot[],
  quantity8: number
): { costCents: number; remaining8: number } {
  let toConsume = quantity8;
  let costCents = 0;

  while (toConsume > 0 && lots.length > 0) {
    const lot = LOT_MATCHING === "fifo" ? lots[0] : lots[lots.length - 1];
    const taken = Math.min(lot.quantity8, toConsume);
    const takenCost =
      taken === lot.quantity8
        ? lot.costCents
        : Math.round((lot.costCents * taken) / lot.quantity8);

    costCents += takenCost;
    lot.quantity8 -= taken;
    lot.costCents -= takenCost;
    toConsume -= taken;

    if (lot.quantity8 <= 0) {
      if (LOT_MATCHING === "fifo") lots.shift();
      else lots.pop();
    }
  }

  return { costCents, remaining8: toConsume };
}

/**
 * Ricostruisce le posizioni aperte scaricando i lotti in ordine cronologico.
 * Gli strumenti interamente venduti restano nel risultato con quantita' zero:
 * la plusvalenza realizzata resta consultabile.
 */
export function buildPositions(
  trades: Trade[],
  instruments: Instrument[]
): Position[] {
  const byId = new Map(instruments.map((item) => [item.id, item]));
  const ordered = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  const positions = new Map<string, Position>();

  for (const trade of ordered) {
    const instrument = byId.get(trade.instrumentId);
    if (!instrument) continue;

    let position = positions.get(trade.instrumentId);
    if (!position) {
      position = {
        instrument,
        quantity8: 0,
        costCents: 0,
        averageCost8: 0,
        realizedCents: 0,
        lots: [],
        trades: [],
      };
      positions.set(trade.instrumentId, position);
    }
    position.trades.push(trade);

    if (trade.side === "buy") {
      position.lots.push({
        tradeId: trade.id,
        date: trade.date,
        quantity8: trade.quantity8,
        costCents: trade.cashCents,
      });
      position.quantity8 += trade.quantity8;
      position.costCents += trade.cashCents;
      continue;
    }

    // Vendere piu' del posseduto e' un errore di inserimento: si scarica quanto
    // c'e' e si ignora l'eccedenza, senza generare quantita' negative.
    const { costCents, remaining8 } = consumeLots(
      position.lots,
      trade.quantity8
    );
    const sold8 = trade.quantity8 - remaining8;
    const proceedsCents =
      remaining8 === 0
        ? trade.cashCents
        : Math.round((trade.cashCents * sold8) / trade.quantity8);

    position.quantity8 -= sold8;
    position.costCents -= costCents;
    position.realizedCents += proceedsCents - costCents;
  }

  for (const position of positions.values()) {
    position.averageCost8 = unitPriceFromCents(
      position.costCents,
      position.quantity8
    );
  }

  return [...positions.values()];
}

/** Quotazione da usare: quella del provider, o quella manuale se manca. */
export function resolveQuote(
  instrument: Instrument,
  quotes: QuoteMap
): Quote | null {
  const fetched = quotes[instrument.id];
  if (fetched) return fetched;
  if (instrument.manualPrice8 != null && instrument.manualPrice8 > 0) {
    return {
      price8: instrument.manualPrice8,
      currency: instrument.currency,
      asOf: instrument.manualPriceAt ?? "",
      source: "manual",
    };
  }
  return null;
}

export function valuePositions(
  positions: Position[],
  quotes: QuoteMap,
  rates: FxRates
): ValuedPosition[] {
  return positions.map((position) => {
    const quote = resolveQuote(position.instrument, quotes);
    if (!quote || position.quantity8 === 0) {
      return {
        ...position,
        quote,
        valueCents: position.quantity8 === 0 ? 0 : null,
        unrealizedCents: position.quantity8 === 0 ? 0 : null,
        unrealizedPercent: position.quantity8 === 0 ? 0 : null,
      };
    }

    const grossCents = grossValueCents(position.quantity8, quote.price8);
    const valueCents = convertToBaseCents(grossCents, quote.currency, rates);
    if (valueCents === null) {
      return {
        ...position,
        quote,
        valueCents: null,
        unrealizedCents: null,
        unrealizedPercent: null,
      };
    }

    const unrealizedCents = valueCents - position.costCents;
    return {
      ...position,
      quote,
      valueCents,
      unrealizedCents,
      unrealizedPercent:
        position.costCents > 0
          ? (unrealizedCents / position.costCents) * 100
          : null,
    };
  });
}

export function summarizePortfolio(
  positions: ValuedPosition[]
): PortfolioSummary {
  let costCents = 0;
  let valueCents = 0;
  let realizedCents = 0;
  let hasMissingQuotes = false;
  // La plusvalenza latente confronta solo le posizioni quotate: sommare il
  // costo di una posizione senza prezzo la farebbe apparire come una perdita.
  let quotedCostCents = 0;

  for (const position of positions) {
    realizedCents += position.realizedCents;
    if (position.quantity8 === 0) continue;
    costCents += position.costCents;
    if (position.valueCents === null) {
      hasMissingQuotes = true;
      continue;
    }
    quotedCostCents += position.costCents;
    valueCents += position.valueCents;
  }

  return {
    positions,
    costCents,
    valueCents,
    unrealizedCents: valueCents - quotedCostCents,
    realizedCents,
    hasMissingQuotes,
  };
}
