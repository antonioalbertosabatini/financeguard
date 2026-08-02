/**
 * Verifica che i provider leggano correttamente le risposte reali osservate
 * durante la scelta delle fonti. Le chiamate di rete sono simulate: qui conta la
 * traduzione dei formati, non la disponibilita' del servizio.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { coinGeckoQuotes, coinGeckoSearch } from "@/lib/market/providers/coingecko";
import { twelveDataSearch } from "@/lib/market/providers/twelve-data";
import { yahooQuotes, yahooSearch } from "@/lib/market/providers/yahoo";

function mockResponse(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => payload,
    }))
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("twelveDataSearch", () => {
  it("maps European listings including their currency", async () => {
    mockResponse({
      data: [
        {
          symbol: "SWDA",
          instrument_name: "iShares Core MSCI World UCITS ETF USD (Acc)",
          exchange: "MTA",
          mic_code: "XMIL",
          instrument_type: "ETF",
          country: "Italy",
          currency: "EUR",
        },
        {
          symbol: "AAPL",
          instrument_name: "Apple Inc",
          exchange: "NASDAQ",
          mic_code: "XNGS",
          instrument_type: "Common Stock",
          country: "United States",
          currency: "USD",
        },
      ],
      status: "ok",
    });

    const results = await twelveDataSearch.search("SWDA");

    expect(results).toEqual([
      {
        symbol: "SWDA",
        ticker: "SWDA",
        name: "iShares Core MSCI World UCITS ETF USD (Acc)",
        kind: "etf",
        currency: "EUR",
        exchange: "MTA",
      },
      {
        symbol: "AAPL",
        ticker: "AAPL",
        name: "Apple Inc",
        kind: "stock",
        currency: "USD",
        exchange: "NASDAQ",
      },
    ]);
  });

  it("returns nothing when the response has no data", async () => {
    mockResponse({ status: "error", code: 400 });
    expect(await twelveDataSearch.search("zzz")).toEqual([]);
  });
});

describe("yahooSearch", () => {
  it("keeps the exchange suffix as the quote symbol", async () => {
    mockResponse({
      quotes: [
        {
          symbol: "SWDA.MI",
          shortname: "ISHARES CORE MSCI WORLD UCITS E",
          longname: "iShares Core MSCI World UCITS ETF USD (Acc)",
          exchange: "MIL",
          exchDisp: "Milan",
          quoteType: "ETF",
          isYahooFinance: true,
        },
      ],
    });

    const results = await yahooSearch.search("SWDA");

    expect(results[0].symbol).toBe("SWDA.MI");
    expect(results[0].ticker).toBe("SWDA");
    expect(results[0].kind).toBe("etf");
  });
});

describe("yahooQuotes", () => {
  it("reads price, currency and timestamp from the batch response", async () => {
    mockResponse({
      spark: {
        result: [
          {
            symbol: "SWDA.MI",
            response: [
              {
                meta: {
                  symbol: "SWDA.MI",
                  currency: "EUR",
                  regularMarketPrice: 123.37,
                  regularMarketTime: 1785398811,
                },
              },
            ],
          },
          // Un simbolo sconosciuto arriva senza prezzo e va semplicemente saltato.
          { symbol: "NOPE", response: [{ meta: { symbol: "NOPE" } }] },
        ],
      },
    });

    const quotes = await yahooQuotes.getQuotes(["SWDA.MI", "NOPE"]);

    expect(quotes).toHaveLength(1);
    expect(quotes[0]).toMatchObject({
      symbol: "SWDA.MI",
      price: 123.37,
      currency: "EUR",
    });
    expect(quotes[0].asOf).toBe(new Date(1785398811 * 1000).toISOString());
  });

  it("does not call the network without symbols", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await yahooQuotes.getQuotes([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("coinGecko", () => {
  it("uses the CoinGecko id as the symbol, not the ticker", async () => {
    mockResponse({
      coins: [{ id: "bitcoin", name: "Bitcoin", symbol: "btc" }],
    });

    const results = await coinGeckoSearch.search("bitcoin");

    expect(results[0].symbol).toBe("bitcoin");
    expect(results[0].ticker).toBe("BTC");
    expect(results[0].kind).toBe("crypto");
  });

  it("quotes directly in euro", async () => {
    mockResponse({
      bitcoin: { eur: 55875, last_updated_at: 1785399650 },
      ethereum: { eur: 1662.81, last_updated_at: 1785399650 },
    });

    const quotes = await coinGeckoQuotes.getQuotes(["bitcoin", "ethereum"]);

    expect(quotes).toHaveLength(2);
    expect(quotes[0]).toMatchObject({
      symbol: "bitcoin",
      price: 55875,
      currency: "EUR",
    });
  });
});
