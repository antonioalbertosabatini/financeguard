import { describe, expect, it } from "vitest";
import type { AccumulationPlan } from "@/lib/schemas/accumulation-plan";
import type { Account } from "@/lib/schemas/account";
import {
  expandPlanContributions,
  isDatePaused,
  lifetimePostedContributions,
  postedAsOf,
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
});
