import { describe, expect, it } from "vitest";
import type { AccumulationContribution } from "@/lib/utils/accumulation";
import {
  OTHERS_SLICE_ID,
  buildAllocation,
  buildContributionTimeline,
  summarizeInvestments,
  type InvestmentInstrument,
} from "@/lib/utils/investment-summary";

function makeInstrument(
  overrides: Partial<InvestmentInstrument> = {}
): InvestmentInstrument {
  return {
    id: "pln_1",
    name: "VWCE",
    kind: "plan",
    invested: 0,
    yearInvested: 0,
    ...overrides,
  };
}

function makeContribution(
  date: string,
  amount: number
): AccumulationContribution {
  return {
    planId: "pln_1",
    occurrenceId: `occ_${date}_${amount}`,
    date,
    amount,
    sourceAccountId: "acc_1",
  };
}

describe("summarizeInvestments", () => {
  it("splits totals between plans and stocks", () => {
    const summary = summarizeInvestments([
      makeInstrument({ id: "a", invested: 10000, yearInvested: 2000 }),
      makeInstrument({ id: "b", kind: "stock", invested: 5000, yearInvested: 500 }),
      makeInstrument({ id: "c", kind: "stock", invested: 0 }),
    ]);
    expect(summary).toEqual({
      total: 15000,
      yearTotal: 2500,
      plansTotal: 10000,
      stocksTotal: 5000,
      instruments: 2,
    });
  });

  it("handles an empty list", () => {
    expect(summarizeInvestments([]).total).toBe(0);
  });
});

describe("buildAllocation", () => {
  it("sorts by amount and computes shares, skipping empty instruments", () => {
    const slices = buildAllocation([
      makeInstrument({ id: "a", name: "A", invested: 1000 }),
      makeInstrument({ id: "b", name: "B", kind: "stock", invested: 3000 }),
      makeInstrument({ id: "c", name: "C", invested: 0 }),
    ]);
    expect(slices.map((s) => s.id)).toEqual(["b", "a"]);
    expect(slices[0].share).toBeCloseTo(0.75);
    expect(slices[1].share).toBeCloseTo(0.25);
  });

  it("groups the smallest instruments into an others slice", () => {
    const instruments = [1, 2, 3, 4, 5, 6, 7].map((n) =>
      makeInstrument({ id: `i${n}`, name: `I${n}`, invested: n * 100 })
    );
    const slices = buildAllocation(instruments, 6);
    expect(slices).toHaveLength(6);
    expect(slices.slice(0, 5).map((s) => s.id)).toEqual([
      "i7",
      "i6",
      "i5",
      "i4",
      "i3",
    ]);
    expect(slices[5]).toMatchObject({
      id: OTHERS_SLICE_ID,
      kind: "others",
      amount: 300,
    });
  });

  it("returns nothing when no money is invested", () => {
    expect(buildAllocation([makeInstrument()])).toEqual([]);
  });
});

describe("buildContributionTimeline", () => {
  it("fills empty months and accumulates up to the reference month", () => {
    const points = buildContributionTimeline(
      [
        makeContribution("2025-11-10", 1000),
        makeContribution("2026-01-05", 500),
        makeContribution("2026-01-20", 250),
      ],
      "2026-03-15"
    );
    expect(points.map((p) => [p.key, p.amount, p.cumulative])).toEqual([
      ["2025-11", 1000, 1000],
      ["2025-12", 0, 1000],
      ["2026-01", 750, 1750],
      ["2026-02", 0, 1750],
      ["2026-03", 0, 1750],
    ]);
    expect(points[2]).toMatchObject({ period: "month", year: 2026, month: 1 });
  });

  it("ignores contributions after the reference date", () => {
    const points = buildContributionTimeline(
      [
        makeContribution("2026-01-05", 500),
        makeContribution("2026-05-01", 900),
      ],
      "2026-02-01"
    );
    expect(points.map((p) => p.key)).toEqual(["2026-01", "2026-02"]);
    expect(points.at(-1)?.cumulative).toBe(500);
  });

  it("switches to yearly buckets for long ranges", () => {
    const points = buildContributionTimeline(
      [
        makeContribution("2020-03-01", 100),
        makeContribution("2020-09-01", 200),
        makeContribution("2024-06-01", 400),
      ],
      "2025-01-31"
    );
    expect(points.map((p) => [p.key, p.amount, p.cumulative])).toEqual([
      ["2020", 300, 300],
      ["2021", 0, 300],
      ["2022", 0, 300],
      ["2023", 0, 300],
      ["2024", 400, 700],
      ["2025", 0, 700],
    ]);
    expect(points.every((p) => p.period === "year")).toBe(true);
  });

  it("returns nothing without contributions", () => {
    expect(buildContributionTimeline([], "2026-01-01")).toEqual([]);
  });
});
