import { describe, expect, it } from "vitest";
import type { ExpandedTransaction } from "@/lib/schemas/transaction";
import {
  expandRecurrences,
  filterOccurrencesForListView,
  getOccurrenceMonthLabel,
} from "@/lib/utils/recurrence";

function makeRecurringRule() {
  return {
    id: "tx_1",
    date: "2026-03-01",
    amount: 10000,
    type: "expense" as const,
    categoryId: "cat_1",
    accountId: "acc_1",
    notes: "",
    tags: [] as string[],
    isRecurring: true,
    recurrenceStart: "2026-03-01",
    recurrenceEnd: "2026-12-31",
  };
}

function makeOccurrence(date: string): ExpandedTransaction {
  return {
    ...makeRecurringRule(),
    date,
    occurrenceId: `tx_1_${date}`,
    isOccurrence: true,
    sourceTransactionId: "tx_1",
  };
}

describe("filterOccurrencesForListView", () => {
  const referenceDate = new Date(2026, 6, 1);

  it("keeps occurrences up to the current month for the current year", () => {
    const occurrences = expandRecurrences([makeRecurringRule()], 2026).filter(
      (tx) => tx.isOccurrence
    );

    const filtered = filterOccurrencesForListView(
      occurrences,
      2026,
      referenceDate
    );

    expect(filtered.map((tx) => tx.date)).toEqual([
      "2026-07-01",
      "2026-06-01",
      "2026-05-01",
      "2026-04-01",
      "2026-03-01",
    ]);
  });

  it("keeps all occurrences for a past year", () => {
    const pastOccurrences = [
      makeOccurrence("2024-11-01"),
      makeOccurrence("2024-12-01"),
    ];

    const filtered = filterOccurrencesForListView(
      pastOccurrences,
      2024,
      referenceDate
    );

    expect(filtered).toHaveLength(2);
  });

  it("returns no occurrences for a future year", () => {
    const futureOccurrences = [
      makeOccurrence("2027-01-01"),
      makeOccurrence("2027-02-01"),
    ];

    const filtered = filterOccurrencesForListView(
      futureOccurrences,
      2027,
      referenceDate
    );

    expect(filtered).toEqual([]);
  });
});

describe("getOccurrenceMonthLabel", () => {
  it("formats the month label in Italian", () => {
    expect(getOccurrenceMonthLabel("2026-07-15", 2026)).toBe("lug 2026");
  });
});
