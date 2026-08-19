import { describe, expect, it } from "vitest";
import {
  DEFAULT_INCOME_ALLOCATION_PERCENTS,
  emptyPeriodAssignments,
  settingsSchema,
} from "@/lib/schemas/settings";
import type { ExpandedTransaction } from "@/lib/schemas/transaction";
import {
  allocateCents,
  areAllocationPercentsValid,
  bucketProgress,
  filterIncomeTransactions,
  persistIncomeCategoryIds,
  persistPeriodAssignments,
  periodKey,
  resolveIncomeCategoryIds,
  sanitizePeriodAssignments,
  spentByBucket,
  sumAllocationPercents,
} from "@/lib/utils/income-allocation";

function incomeTx(
  overrides: Partial<ExpandedTransaction> = {}
): ExpandedTransaction {
  return {
    id: "tx_1",
    date: "2026-08-01",
    amount: 1000,
    type: "income",
    categoryId: "cat_stipendio",
    accountId: "acc_1",
    notes: "",
    tags: [],
    isRecurring: false,
    occurrenceId: "tx_1",
    isOccurrence: false,
    sourceTransactionId: "tx_1",
    ...overrides,
  };
}

describe("allocateCents", () => {
  it("returns zeros when income is zero", () => {
    expect(allocateCents(0, DEFAULT_INCOME_ALLOCATION_PERCENTS)).toEqual({
      essentials: 0,
      discretionary: 0,
      debtOrInvest: 0,
      shortTerm: 0,
      longTerm: 0,
    });
  });

  it("splits exact hundreds without remainder", () => {
    expect(allocateCents(10_000, DEFAULT_INCOME_ALLOCATION_PERCENTS)).toEqual({
      essentials: 5500,
      discretionary: 500,
      debtOrInvest: 1000,
      shortTerm: 1500,
      longTerm: 1500,
    });
  });

  it("keeps the sum equal to total cents on odd amounts", () => {
    const amounts = allocateCents(333, DEFAULT_INCOME_ALLOCATION_PERCENTS);
    const sum = Object.values(amounts).reduce((acc, n) => acc + n, 0);
    expect(sum).toBe(333);
    expect(amounts).toEqual({
      essentials: 183,
      discretionary: 17,
      debtOrInvest: 33,
      shortTerm: 50,
      longTerm: 50,
    });
  });

  it("gives a single leftover cent to the largest remainder", () => {
    expect(allocateCents(1, DEFAULT_INCOME_ALLOCATION_PERCENTS)).toEqual({
      essentials: 1,
      discretionary: 0,
      debtOrInvest: 0,
      shortTerm: 0,
      longTerm: 0,
    });
  });
});

describe("allocation percents", () => {
  it("treats the defaults as valid and summing to 100", () => {
    expect(sumAllocationPercents(DEFAULT_INCOME_ALLOCATION_PERCENTS)).toBe(100);
    expect(areAllocationPercentsValid(DEFAULT_INCOME_ALLOCATION_PERCENTS)).toBe(
      true
    );
  });
});

describe("filterIncomeTransactions", () => {
  const txs = [
    incomeTx({ id: "tx_a", categoryId: "cat_a", amount: 100 }),
    incomeTx({ id: "tx_b", categoryId: "cat_b", amount: 200 }),
    incomeTx({
      id: "tx_e",
      type: "expense",
      categoryId: "cat_food",
      amount: 50,
    }),
  ];

  it("keeps every income tx when no category filter is set", () => {
    expect(filterIncomeTransactions(txs, []).map((tx) => tx.id)).toEqual([
      "tx_a",
      "tx_b",
    ]);
  });

  it("keeps only selected income categories", () => {
    expect(filterIncomeTransactions(txs, ["cat_b"]).map((tx) => tx.id)).toEqual(
      ["tx_b"]
    );
  });
});

describe("income category id persistence", () => {
  it("resolves empty stored ids to all current categories", () => {
    expect(resolveIncomeCategoryIds([], ["a", "b"])).toEqual(["a", "b"]);
  });

  it("drops deleted category ids", () => {
    expect(resolveIncomeCategoryIds(["a", "gone"], ["a", "b"])).toEqual(["a"]);
  });

  it("falls back to all when every stored id is gone", () => {
    expect(resolveIncomeCategoryIds(["gone"], ["a", "b"])).toEqual(["a", "b"]);
  });

  it("persists empty when every current category is selected", () => {
    expect(persistIncomeCategoryIds(["a", "b"], ["a", "b"])).toEqual([]);
  });
});

describe("legacy settings", () => {
  it("fills default incomeAllocation when the field is missing", () => {
    const parsed = settingsSchema.parse({
      defaultCurrency: "EUR",
      locale: "it-IT",
    });
    expect(parsed.incomeAllocation.percents).toEqual(
      DEFAULT_INCOME_ALLOCATION_PERCENTS
    );
    expect(parsed.incomeAllocation.incomeCategoryIds).toEqual([]);
    expect(parsed.incomeAllocationAssignments).toEqual({});
  });
});

describe("period assignments", () => {
  const valid = new Set(["tx_a", "tx_b", "tx_c"]);
  const pac = new Set(["pac_1_2026-08-01"]);

  it("builds YYYY-MM period keys", () => {
    expect(periodKey(2026, 8)).toBe("2026-08");
  });

  it("drops orphans, PAC ids, and duplicate occupancy", () => {
    const sanitized = sanitizePeriodAssignments(
      {
        essentials: ["tx_a", "gone", "pac_1_2026-08-01"],
        discretionary: ["tx_a", "tx_b"],
        debtOrInvest: [],
        shortTerm: [],
        longTerm: ["tx_c"],
      },
      valid,
      pac
    );
    expect(sanitized.essentials).toEqual(["tx_a"]);
    expect(sanitized.discretionary).toEqual(["tx_b"]);
    expect(sanitized.longTerm).toEqual(["tx_c"]);
  });

  it("keeps PAC out of persisted longTerm and enforces exclusivity on save", () => {
    const next = persistPeriodAssignments(
      {
        "2026-08": {
          essentials: ["tx_a"],
          discretionary: [],
          debtOrInvest: [],
          shortTerm: [],
          longTerm: [],
        },
      },
      2026,
      8,
      "discretionary",
      ["tx_a", "tx_b", "pac_1_2026-08-01"],
      valid,
      pac
    );
    expect(next["2026-08"]?.essentials).toEqual([]);
    expect(next["2026-08"]?.discretionary).toEqual(["tx_a", "tx_b"]);
  });

  it("removes an empty period from the map", () => {
    const next = persistPeriodAssignments(
      {
        "2026-08": {
          ...emptyPeriodAssignments(),
          essentials: ["tx_a"],
        },
      },
      2026,
      8,
      "essentials",
      [],
      valid,
      pac
    );
    expect(next["2026-08"]).toBeUndefined();
  });

  it("adds PAC amounts only to longTerm spent", () => {
    const amounts = new Map([
      ["tx_a", 100],
      ["pac_1_2026-08-01", 250],
    ]);
    const spent = spentByBucket(
      amounts,
      { ...emptyPeriodAssignments(), essentials: ["tx_a"] },
      ["pac_1_2026-08-01"]
    );
    expect(spent.essentials).toBe(100);
    expect(spent.longTerm).toBe(250);
  });

  it("reports remaining and excess against the target", () => {
    const zero = {
      essentials: 0,
      discretionary: 0,
      debtOrInvest: 0,
      shortTerm: 0,
      longTerm: 0,
    };
    const progress = bucketProgress(
      { ...zero, essentials: 200 },
      { ...zero, essentials: 250 }
    );
    expect(progress.essentials.target).toBe(200);
    expect(progress.essentials.spent).toBe(250);
    expect(progress.essentials.remaining).toBe(-50);
  });
});
