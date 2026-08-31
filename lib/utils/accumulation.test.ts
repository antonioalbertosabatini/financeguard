import { describe, expect, it } from "vitest";
import type { AccumulationPlan } from "@/lib/schemas/accumulation-plan";
import type { Account } from "@/lib/schemas/account";
import {
  expandPlanContributions,
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
    name: "VWCE",
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
  it("returns only stored one-time contributions", () => {
    const plan = makePlan({
      oneTimeContributions: [
        {
          id: "pax_1",
          date: "2026-01-05",
          amount: 10000,
          sourceAccountId: "acc_1",
        },
        {
          id: "pax_2",
          date: "2026-02-01",
          amount: 15000,
          sourceAccountId: "acc_1",
        },
      ],
    });
    const contributions = expandPlanContributions(plan, "2026-01-31");

    expect(contributions).toEqual([
      {
        planId: "pac_1",
        occurrenceId: "pax_1",
        date: "2026-01-05",
        amount: 10000,
        sourceAccountId: "acc_1",
      },
    ]);
  });

  it("does not invent scheduled installments from leftover legacy fields", () => {
    const plan = makePlan({
      oneTimeContributions: [
        {
          id: "pax_1",
          date: "2026-01-12",
          amount: 5000,
          sourceAccountId: "acc_1",
        },
      ],
    });
    const dates = expandPlanContributions(plan, "2026-12-31").map(
      (item) => item.date
    );

    expect(dates).toEqual(["2026-01-12"]);
  });

  it("stops posting after asOf", () => {
    const plan = makePlan({
      oneTimeContributions: [
        {
          id: "pax_1",
          date: "2026-01-05",
          amount: 10000,
          sourceAccountId: "acc_1",
        },
        {
          id: "pax_2",
          date: "2026-01-19",
          amount: 10000,
          sourceAccountId: "acc_1",
        },
      ],
    });
    const posted = postedAsOf(
      expandPlanContributions(plan, "2026-12-31"),
      "2026-01-12"
    ).map((item) => item.date);

    expect(posted).toEqual(["2026-01-05"]);
  });
});

describe("accumulation balances", () => {
  it("debits the source account and keeps envelope total", () => {
    const plan = makePlan({
      oneTimeContributions: [
        {
          id: "pax_1",
          date: "2026-01-05",
          amount: 10000,
          sourceAccountId: "acc_1",
        },
        {
          id: "pax_2",
          date: "2026-01-12",
          amount: 10000,
          sourceAccountId: "acc_1",
        },
        {
          id: "pax_3",
          date: "2026-01-19",
          amount: 10000,
          sourceAccountId: "acc_1",
        },
      ],
    });
    const posted = lifetimePostedContributions(plan, "2026-01-19");
    const envelope = sumAccumulation(posted);
    const source = calculateAccountBalance(makeAccount(), [], [], posted);

    expect(posted).toHaveLength(3);
    expect(envelope).toBe(30000);
    expect(source).toBe(20000);
    expect(source + envelope).toBe(50000);
  });

  it("debits a different source account and keeps the envelope invariant", () => {
    const plan = makePlan({
      oneTimeContributions: [
        {
          id: "pax_1",
          date: "2026-01-05",
          amount: 10000,
          sourceAccountId: "acc_1",
        },
        {
          id: "pax_2",
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
});
