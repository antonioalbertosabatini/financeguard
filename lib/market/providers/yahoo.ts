/**
 * Yahoo Finance, endpoint pubblici non documentati.
 *
 * E' l'unica fonte gratuita che quota gli ETF UCITS europei nella valuta di
 * negoziazione, e accetta piu' simboli in una sola chiamata. In cambio non manda
 * header CORS (serve il trasporto nativo di lib/market/http) e non offre
 * garanzie di continuita': se cambia, si passa a un altro provider o al prezzo
 * manuale senza toccare il resto dell'app.
 */
import { canReachCorsRestrictedSources, fetchJson } from "@/lib/market/http";
import type {
  ProviderQuote,
  QuoteProvider,
  SymbolResult,
  SymbolSearchProvider,
} from "@/lib/market/types";

const BASE = "https://query1.finance.yahoo.com";

interface SparkResponse {
  spark?: {
    result?: Array<{
      symbol: string;
      response?: Array<{
        meta?: {
          symbol?: string;
          currency?: string;
          regularMarketPrice?: number;
          regularMarketTime?: number;
        };
      }>;
    }>;
  };
}

interface SearchResponse {
  quotes?: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    exchange?: string;
    exchDisp?: string;
    quoteType?: string;
    isYahooFinance?: boolean;
  }>;
}

function toKind(quoteType: string | undefined): SymbolResult["kind"] {
  const type = (quoteType ?? "").toUpperCase();
  if (type === "ETF" || type === "MUTUALFUND") return "etf";
  if (type === "CRYPTOCURRENCY") return "crypto";
  return "stock";
}

export const yahooSearch: SymbolSearchProvider = {
  id: "yahoo",

  async search(query, signal) {
    const url = `${BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`;
    const response = await fetchJson<SearchResponse>(url, signal);
    return (response.quotes ?? [])
      .filter((item) => item.symbol && item.isYahooFinance !== false)
      .map((item) => ({
        symbol: item.symbol as string,
        ticker: (item.symbol as string).split(".")[0],
        name: item.longname ?? item.shortname ?? (item.symbol as string),
        kind: toKind(item.quoteType),
        // La ricerca non espone la valuta: la determina la quotazione.
        currency: "",
        exchange: item.exchDisp ?? item.exchange ?? "",
      }));
  },
};

export const yahooQuotes: QuoteProvider = {
  id: "yahoo",

  isConfigured() {
    return canReachCorsRestrictedSources();
  },

  async getQuotes(symbols, signal) {
    if (symbols.length === 0) return [];

    const url = `${BASE}/v7/finance/spark?symbols=${encodeURIComponent(symbols.join(","))}&range=1d&interval=1d`;
    const response = await fetchJson<SparkResponse>(url, signal);

    const quotes: ProviderQuote[] = [];
    for (const result of response.spark?.result ?? []) {
      const meta = result.response?.[0]?.meta;
      if (!meta?.regularMarketPrice) continue;
      quotes.push({
        symbol: meta.symbol ?? result.symbol,
        price: meta.regularMarketPrice,
        currency: meta.currency ?? "USD",
        asOf: meta.regularMarketTime
          ? new Date(meta.regularMarketTime * 1000).toISOString()
          : new Date().toISOString(),
      });
    }
    return quotes;
  },
};
