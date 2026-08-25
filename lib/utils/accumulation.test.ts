import { describe, expect, it } from "vitest";
import type { AccumulationPlan } from "@/lib/schemas/accumulation-plan";
import type { Account } from "@/lib/schemas/account";
import {
  amountOnDate,
  applyAmountChange,
  expandPlanContributions,
  isDatePaused,
  lifetimePostedContributions,
  normalizeAmountSchedule,
  postedAsOf,
  removeAmountChange,
  sumAccumulation,
} from "@/lib/utils/accumulation";
import { calculateAccountBalance } from "@/lib/utils/balance";

function makePlan(
  overrides: Partial<AccumulationPlan> = {}
): AccumulationPlan {
  return {
    id: "pac_1",
    name: "Fondo",
    amount: 10000,
    frequency: "weekly",
    sourceAccountId: "acc_1",
    startDate: "2026-01-05",
    status: "active",
    pausePeriods: [],
    amountSchedule: [],
    oneTimeContributions: [],
    ...overrides,
  };
}

function makeAccount(): Account {
  return {
    id: "acc_1",
    name: "Corrente",
    type: "checking",
    initialBalance: 50000,
    currency: "EUR",
    icon: "wallet",
    order: 0,
  };
}

describe("expandPlanContributions", () => {
  it("expands weekly from the start date", () => {
    const dates = expandPlanContributions(
      makePlan(),
      "2026-01-26"
    ).map((item) => item.date);

    expect(dates).toEqual([
      "2026-01-05",
      "2026-01-12",
      "2026-01-19",
      "2026-01-26",
    ]);
  });

  it("expands every two weeks", () => {
    const dates = expandPlanContributions(
      makePlan({ frequency: "biweekly" }),
      "2026-02-02"
    ).map((item) => item.date);

    expect(dates).toEqual(["2026-01-05", "2026-01-19", "2026-02-02"]);
  });

  it("clamps monthly 31 to February 28 in a non-leap year", () => {
    const dates = expandPlanContributions(
      makePlan({
        frequency: "monthly",
        startDate: "2026-01-31",
      }),
      "2026-04-30"
    ).map((item) => item.date);

    expect(dates).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("skips paused dates without backfilling after resume", () => {
    const plan = makePlan({
      status: "active",
      pausePeriods: [{ from: "2026-01-12", to: "2026-01-26" }],
    });
    const dates = expandPlanContributions(plan, "2026-01-26").map(
      (item) => item.date
    );

    expect(dates).toEqual(["2026-01-05", "2026-01-26"]);
    expect(isDatePaused(plan, "2026-01-12")).toBe(true);
    expect(isDatePaused(plan, "2026-01-19")).toBe(true);
    expect(isDatePaused(plan, "2026-01-26")).toBe(false);
  });

  it("stops posting after asOf", () => {
    const contributions = expandPlanContributions(makePlan(), "2026-12-31");
    const posted = postedAsOf(contributions, "2026-01-12").map(
      (item) => item.date
    );

    expect(posted).toEqual(["2026-01-05", "2026-01-12"]);
  });

  it("uses plan.amount when the schedule is missing", () => {
    const plan = makePlan({ amount: 10000, amountSchedule: [] });
    const amounts = expandPlanContributions(plan, "2026-01-19").map(
      (item) => item.amount
    );

    expect(amounts).toEqual([10000, 10000, 10000]);
  });

  it("applies successive installment changes by date", () => {
    const plan = makePlan({
      frequency: "monthly",
      startDate: "2026-01-01",
      amount: 20000,
      amountSchedule: [
        { from: "2026-01-01", amount: 10000 },
        { from: "2026-03-01", amount: 15000 },
        { from: "2026-09-01", amount: 20000 },
      ],
    });
    const contributions = expandPlanContributions(plan, "2026-12-01");

    expect(contributions.map((item) => [item.date, item.amount])).toEqual([
      ["2026-01-01", 10000],
      ["2026-02-01", 10000],
      ["2026-03-01", 15000],
      ["2026-04-01", 15000],
      ["2026-05-01", 15000],
      ["2026-06-01", 15000],
      ["2026-07-01", 15000],
      ["2026-08-01", 15000],
      ["2026-09-01", 20000],
      ["2026-10-01", 20000],
      ["2026-11-01", 20000],
      ["2026-12-01", 20000],
    ]);
    expect(sumAccumulation(contributions)).toBe(190000);
  });

  it("keeps the old installment before a future change", () => {
    const plan = makePlan({
      frequency: "monthly",
      startDate: "2026-01-01",
      amount: 10000,
      amountSchedule: [
        { from: "2026-01-01", amount: 10000 },
        { from: "2026-03-01", amount: 20000 },
      ],
    });
    const contributions = expandPlanContributions(plan, "2026-02-01");

    expect(contributions.map((item) => item.amount)).toEqual([10000, 10000]);
  });

  it("uses the new installment after a pause, without backfilling", () => {
    const plan = makePlan({
      amount: 20000,
      pausePeriods: [{ from: "2026-01-12", to: "2026-01-26" }],
      amountSchedule: [
        { from: "2026-01-05", amount: 10000 },
        { from: "2026-01-19", amount: 20000 },
      ],
    });
    const contributions = expandPlanContributions(plan, "2026-01-26");

    expect(contributions.map((item) => [item.date, item.amount])).toEqual([
      ["2026-01-05", 10000],
      ["2026-01-26", 20000],
    ]);
  });
});

describe("amount schedule", () => {
  it("falls back to a single segment from startDate", () => {
    expect(normalizeAmountSchedule(makePlan({ amount: 10000 }))).toEqual([
      { from: "2026-01-05", amount: 10000 },
    ]);
  });

  it("replaces a change on the same effective date", () => {
    const schedule = [
      { from: "2026-01-05", amount: 10000 },
      { from: "2026-03-01", amount: 15000 },
    ];
    const next = applyAmountChange(schedule, "2026-03-01", 18000);

    expect(next).toEqual([
      { from: "2026-01-05", amount: 10000 },
      { from: "2026-03-01", amount: 18000 },
    ]);
    expect(
      amountOnDate(makePlan({ amountSchedule: next, amount: 18000 }), "2026-03-01")
    ).toBe(18000);
  });

  it("is a no-op when the amount in effect is unchanged", () => {
    const schedule = [{ from: "2026-01-05", amount: 10000 }];
    expect(applyAmountChange(schedule, "2026-02-01", 10000)).toEqual(schedule);
  });

  it("does not remove the initial segment", () => {
    const schedule = [
      { from: "2026-01-05", amount: 10000 },
      { from: "2026-03-01", amount: 15000 },
    ];
    expect(removeAmountChange(schedule, "2026-01-05")).toEqual(schedule);
    expect(removeAmountChange(schedule, "2026-03-01")).toEqual([
      { from: "2026-01-05", amount: 10000 },
    ]);
  });
});

describe("accumulation balances", () => {
  it("debits the source account and keeps envelope total", () => {
    const plan = makePlan({ amount: 10000 });
    const posted = lifetimePostedContributions(plan, "2026-01-19");
    const envelope = sumAccumulation(posted);
    const source = calculateAccountBalance(makeAccount(), [], [], posted);

    expect(posted).toHaveLength(3);
    expect(envelope).toBe(30000);
    expect(source).toBe(20000);
    expect(source + envelope).toBe(50000);
  });

  it("keeps the balance invariant with mixed installments", () => {
    const plan = makePlan({
      amount: 20000,
      amountSchedule: [
        { from: "2026-01-05", amount: 10000 },
        { from: "2026-01-19", amount: 20000 },
      ],
    });
    const posted = lifetimePostedContributions(plan, "2026-01-19");
    const envelope = sumAccumulation(posted);
    const source = calculateAccountBalance(makeAccount(), [], [], posted);

    expect(posted.map((item) => item.amount)).toEqual([10000, 10000, 20000]);
    expect(envelope).toBe(40000);
    expect(source).toBe(10000);
    expect(source + envelope).toBe(50000);
  });
});

describe("one-time contributions", () => {
  it("keeps a one-time deposit on the same day as an installment", () => {
    const plan = makePlan({
      oneTimeContributions: [
        {
          id: "pax_1",
          date: "2026-01-05",
          amount: 25000,
          sourceAccountId: "acc_1",
        },
      ],
    });
    const contributions = expandPlanContributions(plan, "2026-01-05");

    expect(contributions).toEqual([
      {
        planId: "pac_1",
        occurrenceId: "pac_1_2026-01-05",
        date: "2026-01-05",
        amount: 10000,
        sourceAccountId: "acc_1",
        kind: "scheduled",
      },
      {
        planId: "pac_1",
        occurrenceId: "pax_1",
        date: "2026-01-05",
        amount: 25000,
        sourceAccountId: "acc_1",
        kind: "oneTime",
      },
    ]);
  });

  it("posts a one-time deposit during a pause", () => {
    const plan = makePlan({
      pausePeriods: [{ from: "2026-01-12", to: "2026-01-26" }],
      oneTimeContributions: [
        {
          id: "pax_1",
          date: "2026-01-12",
          amount: 5000,
          sourceAccountId: "acc_1",
        },
      ],
    });
    const contributions = expandPlanContributions(plan, "2026-01-26");

    expect(contributions.map((item) => [item.date, item.kind, item.amount])).toEqual([
      ["2026-01-05", "scheduled", 10000],
      ["2026-01-12", "oneTime", 5000],
      ["2026-01-26", "scheduled", 10000],
    ]);
  });

  it("debits a different source account and keeps the envelope invariant", () => {
    const plan = makePlan({
      oneTimeContributions: [
        {
          id: "pax_1",
          date: "2026-01-05",
          amount: 5000,
          sourceAccountId: "acc_2",
        },
      ],
    });
    const posted = lifetimePostedContributions(plan, "2026-01-05");
    const envelope = sumAccumulation(posted);
    const checking = makeAccount();
    const cash: Account = {
      ...checking,
      id: "acc_2",
      name: "Contanti",
      initialBalance: 50000,
    };
    const checkingBalance = calculateAccountBalance(checking, [], [], posted);
    const cashBalance = calculateAccountBalance(cash, [], [], posted);

    expect(envelope).toBe(15000);
    expect(checkingBalance).toBe(40000);
    expect(cashBalance).toBe(45000);
    expect(checkingBalance + cashBalance + envelope).toBe(100000);
  });

  it("includes a one-time deposit before the plan start date", () => {
    const plan = makePlan({
      oneTimeContributions: [
        {
          id: "pax_1",
          date: "2025-12-20",
          amount: 8000,
          sourceAccountId: "acc_1",
        },
      ],
    });
    const posted = lifetimePostedContributions(plan, "2026-01-05");

    expect(posted.map((item) => [item.date, item.kind, item.amount])).toEqual([
      ["2025-12-20", "oneTime", 8000],
      ["2026-01-05", "scheduled", 10000],
    ]);
  });
});
