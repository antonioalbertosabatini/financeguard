import { describe, expect, it } from "vitest";
import {
  accountsFileSchema,
  assignAccountOrders,
  sortAccounts,
  type Account,
  type AccountDraft,
} from "@/lib/schemas/account";
import { emptyDataset, normalizeDataset } from "@/lib/storage/dataset";

function draft(
  id: string,
  name: string,
  order?: number
): AccountDraft {
  return {
    id,
    name,
    type: "checking",
    initialBalance: 0,
    currency: "EUR",
    icon: "wallet",
    ...(order !== undefined ? { order } : {}),
  };
}

describe("assignAccountOrders", () => {
  it("defaults missing order to the JSON array index", () => {
    const accounts = assignAccountOrders([
      draft("acc_a", "Alpha"),
      draft("acc_b", "Beta"),
      draft("acc_c", "Gamma"),
    ]);
    expect(accounts.map((account) => [account.id, account.order])).toEqual([
      ["acc_a", 0],
      ["acc_b", 1],
      ["acc_c", 2],
    ]);
  });

  it("keeps an explicit order", () => {
    const accounts = assignAccountOrders([
      draft("acc_b", "Beta", 4),
      draft("acc_a", "Alpha", 1),
    ]);
    expect(accounts.map((account) => account.order)).toEqual([4, 1]);
  });

  it("fills only the accounts that omit order", () => {
    const accounts = assignAccountOrders([
      draft("acc_a", "Alpha", 7),
      draft("acc_b", "Beta"),
    ]);
    expect(accounts.map((account) => account.order)).toEqual([7, 1]);
  });
});

describe("accountsFileSchema", () => {
  it("accepts a legacy accounts.json without order", () => {
    const parsed = accountsFileSchema.parse({
      accounts: [draft("acc_1", "Corrente"), draft("acc_2", "Contanti")],
    });
    expect(parsed.accounts.map((account) => account.order)).toEqual([0, 1]);
  });

  it("preserves stored order values", () => {
    const parsed = accountsFileSchema.parse({
      accounts: [draft("acc_1", "Corrente", 2), draft("acc_2", "Contanti", 0)],
    });
    expect(parsed.accounts.map((account) => account.order)).toEqual([2, 0]);
  });
});

describe("sortAccounts", () => {
  it("sorts by order then id", () => {
    const accounts: Account[] = [
      { ...draft("acc_c", "C"), order: 2 },
      { ...draft("acc_a", "A"), order: 0 },
      { ...draft("acc_b", "B"), order: 1 },
    ];
    expect(sortAccounts(accounts).map((account) => account.id)).toEqual([
      "acc_a",
      "acc_b",
      "acc_c",
    ]);
  });

  it("breaks ties with id for a stable listing after merge", () => {
    const accounts: Account[] = [
      { ...draft("acc_b", "B"), order: 0 },
      { ...draft("acc_a", "A"), order: 0 },
    ];
    expect(sortAccounts(accounts).map((account) => account.id)).toEqual([
      "acc_a",
      "acc_b",
    ]);
  });
});

describe("normalizeDataset", () => {
  it("assigns JSON index when accounts have no order", () => {
    const dataset = emptyDataset();
    dataset.accounts = [
      draft("acc_1", "Uno"),
      draft("acc_2", "Due"),
    ] as Account[];

    normalizeDataset(dataset);

    expect(dataset.accounts.map((account) => account.order)).toEqual([0, 1]);
  });
});
