import { describe, expect, it } from "vitest";
import type { Instrument } from "@/lib/schemas/instrument";
import type { Trade } from "@/lib/schemas/trade";
import {
  buildPositions,
  convertToBaseCents,
  summarizePortfolio,
  valuePositions,
  type QuoteMap,
} from "@/lib/utils/portfolio";
import { UNIT_SCALE } from "@/lib/utils/quantity";

const etf: Instrument = {
  id: "ins_1",
  symbol: "SWDA.MI",
  ticker: "SWDA",
  name: "iShares Core MSCI World",
  kind: "etf",
  currency: "EUR",
  exchange: "MIL",
  isin: "",
  manualPrice8: null,
  manualPriceAt: null,
};

function trade(overrides: Partial<Trade> & Pick<Trade, "id" | "date">): Trade {
  return {
    instrumentId: etf.id,
    side: "buy",
    quantity8: 1 * UNIT_SCALE,
    price8: 100 * UNIT_SCALE,
    feesCents: 0,
    cashCents: 10_000,
    accountId: "acc_1",
    notes: "",
    ...overrides,
  };
}

describe("buildPositions", () => {
  it("accumulates quantity and cost across purchases", () => {
    const positions = buildPositions(
      [
        trade({ id: "t1", date: "2026-01-10", cashCents: 10_000 }),
        trade({
          id: "t2",
          date: "2026-02-10",
          quantity8: 2 * UNIT_SCALE,
          price8: 110 * UNIT_SCALE,
          cashCents: 22_000,
        }),
      ],
      [etf]
    );

    expect(positions).toHaveLength(1);
    expect(positions[0].quantity8).toBe(3 * UNIT_SCALE);
    expect(positions[0].costCents).toBe(32_000);
    // 320 euro per tre quote: 106,666... euro l'una.
    expect(positions[0].averageCost8).toBe(10_666_666_667);
  });

  it("charges the oldest lot first when selling", () => {
    const positions = buildPositions(
      [
        trade({ id: "t1", date: "2026-01-10", cashCents: 10_000 }),
        trade({
          id: "t2",
          date: "2026-02-10",
          price8: 200 * UNIT_SCALE,
          cashCents: 20_000,
        }),
        trade({
          id: "t3",
          date: "2026-03-10",
          side: "sell",
          price8: 250 * UNIT_SCALE,
          cashCents: 25_000,
        }),
      ],
      [etf]
    );

    // Venduto il lotto da 100: guadagno 150, resta in carico quello da 200.
    expect(positions[0].realizedCents).toBe(15_000);
    expect(positions[0].quantity8).toBe(1 * UNIT_SCALE);
    expect(positions[0].costCents).toBe(20_000);
  });

  it("splits cost proportionally on a partial sale", () => {
    const positions = buildPositions(
      [
        trade({
          id: "t1",
          date: "2026-01-10",
          quantity8: 4 * UNIT_SCALE,
          cashCents: 40_000,
        }),
        trade({
          id: "t2",
          date: "2026-02-10",
          side: "sell",
          quantity8: 1 * UNIT_SCALE,
          cashCents: 12_000,
        }),
      ],
      [etf]
    );

    expect(positions[0].realizedCents).toBe(2_000);
    expect(positions[0].quantity8).toBe(3 * UNIT_SCALE);
    expect(positions[0].costCents).toBe(30_000);
  });

  it("ignores the excess when selling more than held", () => {
    const positions = buildPositions(
      [
        trade({ id: "t1", date: "2026-01-10", cashCents: 10_000 }),
        trade({
          id: "t2",
          date: "2026-02-10",
          side: "sell",
          quantity8: 3 * UNIT_SCALE,
          cashCents: 36_000,
        }),
      ],
      [etf]
    );

    expect(positions[0].quantity8).toBe(0);
    // Solo il terzo dell'incasso corrispondente alla quota realmente posseduta.
    expect(positions[0].realizedCents).toBe(2_000);
  });

  it("skips trades whose instrument is missing", () => {
    const positions = buildPositions(
      [trade({ id: "t1", date: "2026-01-10", instrumentId: "unknown" })],
      [etf]
    );
    expect(positions).toHaveLength(0);
  });
});

describe("convertToBaseCents", () => {
  it("returns the amount unchanged for euro", () => {
    expect(convertToBaseCents(12_345, "EUR", {})).toBe(12_345);
  });

  it("divides by the rate for a foreign currency", () => {
    expect(convertToBaseCents(10_000, "USD", { USD: 1.25 })).toBe(8_000);
  });

  it("treats London pence as hundredths of a pound", () => {
    // 10.000 penny = 100 sterline = 125 euro con cambio 0,8.
    expect(convertToBaseCents(1_000_000, "GBp", { GBP: 0.8 })).toBe(12_500);
  });

  it("returns null when the rate is unknown", () => {
    expect(convertToBaseCents(10_000, "JPY", {})).toBeNull();
  });
});

describe("valuePositions", () => {
  const positions = buildPositions(
    [
      trade({
        id: "t1",
        date: "2026-01-10",
        quantity8: 2 * UNIT_SCALE,
        cashCents: 20_000,
      }),
    ],
    [etf]
  );

  it("converts the market value into the base currency", () => {
    const usdInstrument: Instrument = { ...etf, currency: "USD" };
    const quotes: QuoteMap = {
      [etf.id]: {
        price8: 125 * UNIT_SCALE,
        currency: "USD",
        asOf: "2026-07-29T00:00:00.000Z",
        source: "provider",
      },
    };
    const valued = valuePositions(
      buildPositions(
        [
          trade({
            id: "t1",
            date: "2026-01-10",
            quantity8: 2 * UNIT_SCALE,
            cashCents: 20_000,
          }),
        ],
        [usdInstrument]
      ),
      quotes,
      { USD: 1.25 }
    );

    // 2 x 125 dollari = 250 dollari = 200 euro, pari al costo.
    expect(valued[0].valueCents).toBe(20_000);
    expect(valued[0].unrealizedCents).toBe(0);
  });

  it("falls back to the manual price when the provider has none", () => {
    const manual: Instrument = {
      ...etf,
      manualPrice8: 150 * UNIT_SCALE,
      manualPriceAt: "2026-07-29",
    };
    const valued = valuePositions(
      buildPositions(
        [
          trade({
            id: "t1",
            date: "2026-01-10",
            quantity8: 2 * UNIT_SCALE,
            cashCents: 20_000,
          }),
        ],
        [manual]
      ),
      {},
      {}
    );

    expect(valued[0].quote?.source).toBe("manual");
    expect(valued[0].valueCents).toBe(30_000);
    expect(valued[0].unrealizedCents).toBe(10_000);
  });

  it("leaves the position unvalued without any price", () => {
    const valued = valuePositions(positions, {}, {});
    expect(valued[0].valueCents).toBeNull();
    expect(valued[0].unrealizedCents).toBeNull();
  });
});

describe("summarizePortfolio", () => {
  it("excludes unquoted positions from the unrealized gain", () => {
    const quoted: Instrument = { ...etf, id: "ins_quoted" };
    const unquoted: Instrument = { ...etf, id: "ins_unquoted" };

    const positions = buildPositions(
      [
        trade({
          id: "t1",
          date: "2026-01-10",
          instrumentId: quoted.id,
          cashCents: 10_000,
        }),
        trade({
          id: "t2",
          date: "2026-01-10",
          instrumentId: unquoted.id,
          cashCents: 50_000,
        }),
      ],
      [quoted, unquoted]
    );

    const summary = summarizePortfolio(
      valuePositions(
        positions,
        {
          [quoted.id]: {
            price8: 120 * UNIT_SCALE,
            currency: "EUR",
            asOf: "2026-07-29T00:00:00.000Z",
            source: "provider",
          },
        },
        {}
      )
    );

    expect(summary.hasMissingQuotes).toBe(true);
    expect(summary.costCents).toBe(60_000);
    expect(summary.valueCents).toBe(12_000);
    // Confronta solo la posizione quotata: 120 contro 100 euro di costo.
    expect(summary.unrealizedCents).toBe(2_000);
  });
});
