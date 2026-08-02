/**
 * Punto d'ingresso dei dati di mercato: sceglie il provider giusto per ogni
 * strumento, unisce cache e rete e restituisce quotazioni gia' normalizzate.
 *
 * Nessuna chiamata e' bloccante per la pagina: se una fonte fallisce si usa
 * l'ultimo prezzo noto, e se non ce n'e' nessuno la posizione resta senza
 * valorizzazione con un invito a inserire il prezzo a mano.
 */
import { getQuoteProviderId } from "@/lib/market/config";
import { fetchFxRates } from "@/lib/market/fx";
import {
  coinGeckoQuotes,
  coinGeckoSearch,
} from "@/lib/market/providers/coingecko";
import {
  twelveDataQuotes,
  twelveDataSearch,
} from "@/lib/market/providers/twelve-data";
import { yahooQuotes, yahooSearch } from "@/lib/market/providers/yahoo";
import {
  isFresh,
  readCache,
  writeFx,
  writeQuotes,
  type CachedQuote,
} from "@/lib/market/quote-cache";
import type { QuoteProvider, SymbolResult } from "@/lib/market/types";
import type { Instrument, InstrumentKind } from "@/lib/schemas/instrument";
import { UNIT_SCALE } from "@/lib/utils/quantity";
import type { FxRates, QuoteMap } from "@/lib/utils/portfolio";

export { canReachCorsRestrictedSources } from "@/lib/market/http";
export type { SymbolResult } from "@/lib/market/types";

/**
 * La ricerca di azioni ed ETF passa sempre da Twelve Data: risponde senza
 * chiave e con CORS aperto, quindi la lista dei titoli e' disponibile ovunque
 * anche quando le quotazioni non lo sono.
 */
export async function searchSymbols(
  query: string,
  kind: InstrumentKind,
  signal?: AbortSignal
): Promise<SymbolResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  if (kind === "crypto") return coinGeckoSearch.search(trimmed, signal);

  const results = await twelveDataSearch.search(trimmed, signal);
  return kind === "etf"
    ? results.filter((item) => item.kind === "etf")
    : results;
}

/**
 * Yahoo indicizza per ticker con suffisso di borsa ("SWDA.MI"), Twelve Data per
 * ticker nudo: la ricerca restituisce sempre la forma di Twelve Data, quindi il
 * simbolo va tradotto quando le quotazioni arrivano da Yahoo.
 */
export async function resolveQuoteSymbol(
  result: SymbolResult,
  signal?: AbortSignal
): Promise<string> {
  if (result.kind === "crypto" || getQuoteProviderId() !== "yahoo") {
    return result.symbol;
  }

  const candidates = await yahooSearch
    .search(result.symbol, signal)
    .catch(() => [] as SymbolResult[]);
  const match =
    candidates.find(
      (item) =>
        item.ticker === result.ticker &&
        item.exchange.toLowerCase() === result.exchange.toLowerCase()
    ) ?? candidates.find((item) => item.ticker === result.ticker);

  return match?.symbol ?? result.symbol;
}

function quoteProviderFor(kind: InstrumentKind): QuoteProvider | null {
  if (kind === "crypto") return coinGeckoQuotes;
  switch (getQuoteProviderId()) {
    case "yahoo":
      return yahooQuotes;
    case "twelvedata":
      return twelveDataQuotes;
    default:
      return null;
  }
}

export interface QuotesResult {
  quotes: QuoteMap;
  rates: FxRates;
  /** Momento dell'ultimo scaricamento riuscito, null se si e' solo letto dalla cache. */
  refreshedAt: string | null;
  /** True se almeno una fonte non ha risposto. */
  hasErrors: boolean;
}

function toQuoteMap(
  instruments: Instrument[],
  cached: Record<string, CachedQuote>
): QuoteMap {
  const map: QuoteMap = {};
  for (const instrument of instruments) {
    const entry = cached[instrument.symbol];
    if (!entry) continue;
    map[instrument.id] = {
      price8: Math.round(entry.price * UNIT_SCALE),
      currency: entry.currency,
      asOf: entry.asOf,
      source: "provider",
    };
  }
  return map;
}

export async function loadQuotes(
  instruments: Instrument[],
  options: { force?: boolean; signal?: AbortSignal } = {}
): Promise<QuotesResult> {
  const { force = false, signal } = options;
  const cache = await readCache();
  const now = Date.now();

  const stale = instruments.filter(
    (instrument) =>
      force || !isFresh(cache.quotes[instrument.symbol]?.fetchedAt ?? "", now)
  );

  let hasErrors = false;
  let refreshedAt: string | null = null;
  const fetched: Record<string, CachedQuote> = {};

  const byProvider = new Map<QuoteProvider, string[]>();
  for (const instrument of stale) {
    const provider = quoteProviderFor(instrument.kind);
    if (!provider || !provider.isConfigured()) continue;
    const symbols = byProvider.get(provider) ?? [];
    symbols.push(instrument.symbol);
    byProvider.set(provider, symbols);
  }

  await Promise.all(
    [...byProvider].map(async ([provider, symbols]) => {
      try {
        const quotes = await provider.getQuotes([...new Set(symbols)], signal);
        const at = new Date().toISOString();
        for (const quote of quotes) {
          fetched[quote.symbol] = {
            price: quote.price,
            currency: quote.currency,
            asOf: quote.asOf,
            fetchedAt: at,
          };
        }
        refreshedAt = at;
      } catch {
        hasErrors = true;
      }
    })
  );

  if (Object.keys(fetched).length > 0) await writeQuotes(fetched);

  let rates = cache.fx?.rates ?? {};
  if (force || !cache.fx || !isFresh(cache.fx.fetchedAt, now)) {
    try {
      const snapshot = await fetchFxRates(signal);
      rates = snapshot.rates;
      await writeFx({ ...snapshot, fetchedAt: new Date().toISOString() });
    } catch {
      hasErrors = true;
    }
  }

  return {
    quotes: toQuoteMap(instruments, { ...cache.quotes, ...fetched }),
    rates,
    refreshedAt,
    hasErrors,
  };
}
