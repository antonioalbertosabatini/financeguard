import { describe, expect, it } from "vitest";
import {
  parsePendingQuickAddItems,
  partitionPendingQuickAdd,
} from "@/lib/native/quick-add-merge";
import { buildQuickAddCatalog } from "@/lib/native/quick-add-catalog";
import { emptyDataset } from "@/lib/storage/dataset";

const validItem = {
  id: "qa_1",
  amount: 1250,
  type: "expense" as const,
  categoryId: "cat_food",
  accountId: "acc_1",
  date: "2026-08-31",
};

describe("parsePendingQuickAddItems", () => {
  it("keeps well-formed items and drops the rest", () => {
    const parsed = parsePendingQuickAddItems([
      validItem,
      { ...validItem, id: "", amount: 100 },
      { ...validItem, id: "qa_2", amount: 0 },
      { ...validItem, id: "qa_3", type: "transfer" },
      { ...validItem, id: "qa_4", date: "31/08/2026" },
      { ...validItem, id: "qa_5", amount: 12.5 },
      null,
    ]);
    expect(parsed).toEqual([validItem]);
  });

  it("returns an empty list for non-arrays", () => {
    expect(parsePendingQuickAddItems(null)).toEqual([]);
    expect(parsePendingQuickAddItems({})).toEqual([]);
  });
});

describe("partitionPendingQuickAdd", () => {
  const accountIds = new Set(["acc_1"]);
  const categoryTypeById = new Map([
    ["cat_food", "expense"],
    ["cat_salary", "income"],
  ]);

  it("accepts items whose account and category still exist", () => {
    const { accepted, skipped } = partitionPendingQuickAdd(
      [validItem],
      accountIds,
      categoryTypeById
    );
    expect(accepted).toEqual([validItem]);
    expect(skipped).toEqual([]);
  });

  it("skips orphan accounts and mismatched category types", () => {
    const orphan = { ...validItem, id: "qa_2", accountId: "acc_gone" };
    const mismatch = {
      ...validItem,
      id: "qa_3",
      type: "income" as const,
      categoryId: "cat_food",
    };
    const { accepted, skipped } = partitionPendingQuickAdd(
      [validItem, orphan, mismatch],
      accountIds,
      categoryTypeById
    );
    expect(accepted.map((item) => item.id)).toEqual(["qa_1"]);
    expect(skipped.map((item) => item.id)).toEqual(["qa_2", "qa_3"]);
  });
});

describe("buildQuickAddCatalog", () => {
  it("omits balances and picks defaults from the first account and matching categories", () => {
    const dataset = emptyDataset();
    dataset.accounts = [
      {
        id: "acc_2",
        name: "Contanti",
        type: "cash",
        initialBalance: 9999,
        currency: "EUR",
        icon: "banknote",
        order: 1,
      },
      {
        id: "acc_1",
        name: "Conto",
        type: "checking",
        initialBalance: 5000,
        currency: "EUR",
        icon: "wallet",
        order: 0,
      },
    ];
    dataset.categories = [
      {
        id: "cat_salary",
        name: "Stipendio",
        type: "income",
        color: "#00AA00",
        icon: "wallet",
      },
      {
        id: "cat_food",
        name: "Cibo",
        type: "expense",
        color: "#AA0000",
        icon: "utensils",
      },
    ];

    const catalog = buildQuickAddCatalog(dataset);
    expect(catalog.accounts.map((account) => account.id)).toEqual([
      "acc_1",
      "acc_2",
    ]);
    expect(catalog.accounts[0]).not.toHaveProperty("initialBalance");
    expect(catalog.defaults).toEqual({
      accountId: "acc_1",
      expenseCategoryId: "cat_food",
      incomeCategoryId: "cat_salary",
    });
  });
});
