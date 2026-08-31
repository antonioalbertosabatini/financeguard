import { describe, expect, it } from "vitest";
import type { Account } from "@/lib/schemas/account";
import type { StockHolding } from "@/lib/schemas/stock-holding";
import { calculateAccountBalance } from "@/lib/utils/balance";
import { sumAccumulation } from "@/lib/utils/accumulation";
import {
  expandHoldingPurchases,
  holdingTotals,
  lifetimePostedPurchases,
} from "@/lib/utils/stocks";

function makeHolding(
  overrides: Partial<StockHolding> = {}
): StockHolding {
  return {
    id: "stk_1",
    name: "Apple",
    purchases: [],
    ...overrides,
  };
}

function makeAccount(): Account {
  return {
    id: "acc_1",
    name: "Corrente",
    type: "checking",
    initialBalance: 100000,
    currency: "EUR",
    icon: "wallet",
    order: 0,
  };
}

describe("expandHoldingPurchases", () => {
  it("includes fractional quantities and caps by range", () => {
    const holding = makeHolding({
      purchases: [
        {
          id: "skp_1",
          date: "2026-01-10",
          amount: 25000,
          quantity: 1.5,
          sourceAccountId: "acc_1",
        },
        {
          id: "skp_2",
          date: "2026-03-01",
          amount: 10000,
          quantity: 0.25,
          sourceAccountId: "acc_1",
        },
      ],
    });

    const posted = expandHoldingPurchases(holding, "2026-02-01");
    expect(posted).toHaveLength(1);
    expect(posted[0].occurrenceId).toBe("skp_1");
    expect(posted[0].amount).toBe(25000);
  });
});

describe("holdingTotals", () => {
  it("sums invested amount, quantity, and average price", () => {
    const holding = makeHolding({
      purchases: [
        {
          id: "skp_1",
          date: "2026-01-10",
          amount: 20000,
          quantity: 2,
          sourceAccountId: "acc_1",
        },
        {
          id: "skp_2",
          date: "2026-02-10",
          amount: 10000,
          quantity: 0.5,
          sourceAccountId: "acc_1",
        },
      ],
    });

    expect(holdingTotals(holding)).toEqual({
      invested: 30000,
      quantity: 2.5,
      averagePriceCents: 12000,
    });
  });
});

describe("stock balances", () => {
  it("debits the source account and keeps invested capital", () => {
    const holding = makeHolding({
      purchases: [
        {
          id: "skp_1",
          date: "2026-01-10",
          amount: 40000,
          quantity: 4,
          sourceAccountId: "acc_1",
        },
      ],
    });
    const posted = lifetimePostedPurchases(holding, "2026-01-10");
    const invested = sumAccumulation(posted);
    const source = calculateAccountBalance(makeAccount(), [], [], posted);

    expect(invested).toBe(40000);
    expect(source).toBe(60000);
    expect(source + invested).toBe(100000);
  });
});
