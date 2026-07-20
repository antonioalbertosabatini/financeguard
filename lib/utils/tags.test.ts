import { describe, expect, it } from "vitest";
import {
  collectTagsFromTransactions,
  mergeTagLists,
} from "@/lib/utils/tags";

describe("collectTagsFromTransactions", () => {
  it("collects tags from any transaction type including transfer", () => {
    const tags = collectTagsFromTransactions(
      [
        { tags: ["Viaggio", "cibo"] },
        { tags: ["visita mamma 07-2026"] }, // expense/income
        { tags: ["solo-transfer"] }, // would be skipped by getAvailableTags type filter
        { tags: ["viaggio", "  "] },
        { tags: undefined },
      ],
      "it-IT"
    );
    expect(tags).toEqual([
      "cibo",
      "solo-transfer",
      "viaggio",
      "visita mamma 07-2026",
    ]);
  });

  it("returns empty array when there are no tags", () => {
    expect(collectTagsFromTransactions([{ tags: [] }, {}])).toEqual([]);
  });
});

describe("mergeTagLists", () => {
  it("unions and sorts tag lists", () => {
    expect(
      mergeTagLists([["beta", "Alpha"], ["alpha", "gamma"]], "en-US")
    ).toEqual(["alpha", "beta", "gamma"]);
  });
});
