import { describe, expect, it } from "vitest";
import {
  countActiveUiFilters,
  EMPTY_UI_FILTERS,
  matchesUiFilters,
  summarizeByMonth,
  summarizeTransactions,
  type UiTransactionFilters,
} from "@/lib/utils/transaction-filters";

function tx(
  overrides: Partial<{
    date: string;
    amount: number;
    type: string;
    categoryId: string | null;
    accountId: string;
    tags: string[];
  }> = {}
) {
  return {
    date: "2026-03-15",
    amount: 5000,
    type: "expense",
    categoryId: "cat_1",
    accountId: "acc_1",
    tags: ["viaggio", "cibo"],
    ...overrides,
  };
}

function filters(
  overrides: Partial<UiTransactionFilters> = {}
): UiTransactionFilters {
  return { ...EMPTY_UI_FILTERS, ...overrides };
}

describe("matchesUiFilters", () => {
  it("matches everything when filters are empty", () => {
    expect(matchesUiFilters(tx(), EMPTY_UI_FILTERS)).toBe(true);
  });

  it("applies AND across dimensions", () => {
    const f = filters({
      categoryIds: ["cat_1"],
      accountIds: ["acc_2"],
    });
    expect(matchesUiFilters(tx(), f)).toBe(false);
    expect(matchesUiFilters(tx({ accountId: "acc_2" }), f)).toBe(true);
  });

  it("matches category/account/type membership (OR within dimension)", () => {
    expect(
      matchesUiFilters(
        tx({ categoryId: "cat_2" }),
        filters({ categoryIds: ["cat_1", "cat_2"] })
      )
    ).toBe(true);
    expect(
      matchesUiFilters(
        tx({ type: "income" }),
        filters({ types: ["expense"] })
      )
    ).toBe(false);
  });

  it("rejects null category when categories are selected", () => {
    expect(
      matchesUiFilters(
        tx({ categoryId: null }),
        filters({ categoryIds: ["cat_1"] })
      )
    ).toBe(false);
  });

  it("matches tags with ANY (default)", () => {
    const f = filters({ tags: ["viaggio", "lavoro"], tagsMatch: "any" });
    expect(matchesUiFilters(tx({ tags: ["cibo"] }), f)).toBe(false);
    expect(matchesUiFilters(tx({ tags: ["lavoro"] }), f)).toBe(true);
    expect(matchesUiFilters(tx({ tags: ["viaggio", "altro"] }), f)).toBe(true);
  });

  it("matches tags with ALL", () => {
    const f = filters({ tags: ["viaggio", "cibo"], tagsMatch: "all" });
    expect(matchesUiFilters(tx({ tags: ["viaggio"] }), f)).toBe(false);
    expect(matchesUiFilters(tx({ tags: ["viaggio", "cibo"] }), f)).toBe(true);
    expect(
      matchesUiFilters(tx({ tags: ["viaggio", "cibo", "extra"] }), f)
    ).toBe(true);
  });

  it("normalizes tags case-insensitively", () => {
    expect(
      matchesUiFilters(
        tx({ tags: ["Viaggio"] }),
        filters({ tags: ["viaggio"], tagsMatch: "any" })
      )
    ).toBe(true);
  });

  it("applies inclusive amount range", () => {
    expect(
      matchesUiFilters(tx({ amount: 1000 }), filters({ amountMinCents: 1000 }))
    ).toBe(true);
    expect(
      matchesUiFilters(tx({ amount: 999 }), filters({ amountMinCents: 1000 }))
    ).toBe(false);
    expect(
      matchesUiFilters(tx({ amount: 5000 }), filters({ amountMaxCents: 5000 }))
    ).toBe(true);
    expect(
      matchesUiFilters(tx({ amount: 5001 }), filters({ amountMaxCents: 5000 }))
    ).toBe(false);
    expect(
      matchesUiFilters(
        tx({ amount: 2500 }),
        filters({ amountMinCents: 1000, amountMaxCents: 5000 })
      )
    ).toBe(true);
  });

  it("applies inclusive date range", () => {
    expect(
      matchesUiFilters(tx({ date: "2026-03-01" }), filters({ dateFrom: "2026-03-01" }))
    ).toBe(true);
    expect(
      matchesUiFilters(tx({ date: "2026-02-28" }), filters({ dateFrom: "2026-03-01" }))
    ).toBe(false);
    expect(
      matchesUiFilters(tx({ date: "2026-03-31" }), filters({ dateTo: "2026-03-31" }))
    ).toBe(true);
    expect(
      matchesUiFilters(tx({ date: "2026-04-01" }), filters({ dateTo: "2026-03-31" }))
    ).toBe(false);
  });
});

describe("summarizeTransactions / summarizeByMonth", () => {
  it("sums income expense and net", () => {
    const summary = summarizeTransactions([
      { type: "income", amount: 10000 },
      { type: "expense", amount: 3000 },
      { type: "expense", amount: 2000 },
      { type: "transfer", amount: 500 },
    ]);
    expect(summary).toEqual({
      income: 10000,
      expense: 5000,
      net: 5000,
      count: 4,
    });
  });

  it("groups by month descending including mixed rows", () => {
    const months = summarizeByMonth([
      { date: "2026-01-10", type: "expense", amount: 1000 },
      { date: "2026-03-01", type: "income", amount: 5000 },
      { date: "2026-03-15", type: "expense", amount: 2000 },
      { date: "2026-01-20", type: "income", amount: 800 },
    ]);
    expect(months.map((m) => m.monthKey)).toEqual(["2026-03", "2026-01"]);
    expect(months[0]).toMatchObject({
      income: 5000,
      expense: 2000,
      net: 3000,
      count: 2,
    });
    expect(months[1]).toMatchObject({
      income: 800,
      expense: 1000,
      net: -200,
      count: 2,
    });
  });
});

describe("countActiveUiFilters", () => {
  it("counts multi-select values and optional ALL mode", () => {
    expect(countActiveUiFilters(EMPTY_UI_FILTERS)).toBe(0);
    expect(
      countActiveUiFilters(
        filters({
          dateFrom: "2026-01-01",
          categoryIds: ["a", "b"],
          tags: ["x"],
          tagsMatch: "all",
          amountMinCents: 100,
        })
      )
    ).toBe(6);
  });
});
