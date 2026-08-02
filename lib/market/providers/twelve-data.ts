/**
 * Twelve Data.
 *
 * `symbol_search` risponde senza chiave e con CORS aperto, e copre le borse
 * europee: e' la fonte della lista dei titoli selezionabili su ogni piattaforma.
 * Le quotazioni invece richiedono una chiave e sul piano gratuito coprono i soli
 * mercati statunitensi.
 */
import { getMarketApiKey } from "@/lib/market/config";
import { fetchJson } from "@/lib/market/http";
import type {
  ProviderQuote,
  QuoteProvider,
  SymbolResult,
  SymbolSearchProvider,
} from "@/lib/market/types";

const BASE = "https://api.twelvedata.com";

interface SearchResponse {
  data?: Array<{
    symbol: string;
    instrument_name: string;
    exchange: string;
    mic_code: string;
    instrument_type: string;
    country: string;
    currency: string;
  }>;
}

interface QuoteResponse {
  symbol?: string;
  close?: string;
  currency?: string;
  datetime?: string;
  timestamp?: number;
  status?: string;
  code?: number;
  message?: string;
}

function toKind(instrumentType: string): SymbolResult["kind"] {
  return instrumentType.toLowerCase().includes("etf") ? "etf" : "stock";
}

export const twelveDataSearch: SymbolSearchProvider = {
  id: "twelvedata",

  async search(query, signal) {
    const url = `${BASE}/symbol_search?symbol=${encodeURIComponent(query)}&outputsize=20`;
    const response = await fetchJson<SearchResponse>(url, signal);
    return (response.data ?? []).map((item) => ({
      symbol: item.symbol,
      ticker: item.symbol,
      name: item.instrument_name,
      kind: toKind(item.instrument_type),
      currency: item.currency,
      exchange: item.exchange || item.mic_code || "",
    }));
  },
};

export const twelveDataQuotes: QuoteProvider = {
  id: "twelvedata",

  isConfigured() {
    return getMarketApiKey() !== null;
  },

  async getQuotes(symbols, signal) {
    const apiKey = getMarketApiKey();
    if (!apiKey || symbols.length === 0) return [];

    const url = `${BASE}/quote?symbol=${encodeURIComponent(symbols.join(","))}&apikey=${encodeURIComponent(apiKey)}`;
    const raw = await fetchJson<QuoteResponse | Record<string, QuoteResponse>>(
      url,
      signal
    );

    // Con un simbolo solo la risposta e' l'oggetto quotazione, con piu' simboli
    // e' una mappa simbolo -> quotazione.
    const entries: QuoteResponse[] =
      symbols.length === 1
        ? [raw as QuoteResponse]
        : Object.values(raw as Record<string, QuoteResponse>);

    const quotes: ProviderQuote[] = [];
    for (const entry of entries) {
      if (!entry || entry.status === "error" || !entry.close) continue;
      const price = parseFloat(entry.close);
      if (Number.isNaN(price)) continue;
      quotes.push({
        symbol: entry.symbol ?? symbols[0],
        price,
        currency: entry.currency ?? "USD",
        asOf: entry.timestamp
          ? new Date(entry.timestamp * 1000).toISOString()
          : new Date().toISOString(),
      });
    }
    return quotes;
  },
};
