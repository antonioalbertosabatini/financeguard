/**
 * CoinGecko per le crypto: nessuna chiave, CORS aperto, quindi funziona su
 * tutte le piattaforme incluso il browser. Il simbolo memorizzato e' l'id
 * CoinGecko ("bitcoin"), non il ticker: i ticker non sono univoci.
 */
import { fetchJson } from "@/lib/market/http";
import type {
  ProviderQuote,
  QuoteProvider,
  SymbolResult,
  SymbolSearchProvider,
} from "@/lib/market/types";

const BASE = "https://api.coingecko.com/api/v3";
/** Le crypto si quotano in euro alla fonte: nessuna conversione a valle. */
const VS_CURRENCY = "eur";

interface SearchResponse {
  coins?: Array<{ id: string; name: string; symbol: string }>;
}

type PriceResponse = Record<
  string,
  { eur?: number; last_updated_at?: number } | undefined
>;

export const coinGeckoSearch: SymbolSearchProvider = {
  id: "coingecko",

  async search(query, signal) {
    const url = `${BASE}/search?query=${encodeURIComponent(query)}`;
    const response = await fetchJson<SearchResponse>(url, signal);
    return (response.coins ?? []).slice(0, 20).map<SymbolResult>((coin) => ({
      symbol: coin.id,
      ticker: coin.symbol.toUpperCase(),
      name: coin.name,
      kind: "crypto",
      currency: VS_CURRENCY.toUpperCase(),
      exchange: "CoinGecko",
    }));
  },
};

export const coinGeckoQuotes: QuoteProvider = {
  id: "coingecko",

  isConfigured() {
    return true;
  },

  async getQuotes(symbols, signal) {
    if (symbols.length === 0) return [];

    const url = `${BASE}/simple/price?ids=${encodeURIComponent(symbols.join(","))}&vs_currencies=${VS_CURRENCY}&include_last_updated_at=true`;
    const response = await fetchJson<PriceResponse>(url, signal);

    const quotes: ProviderQuote[] = [];
    for (const [id, entry] of Object.entries(response)) {
      if (!entry?.eur) continue;
      quotes.push({
        symbol: id,
        price: entry.eur,
        currency: VS_CURRENCY.toUpperCase(),
        asOf: entry.last_updated_at
          ? new Date(entry.last_updated_at * 1000).toISOString()
          : new Date().toISOString(),
      });
    }
    return quotes;
  },
};
